import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import type { Room, Project, Panelist, CSVRow, ReviewedProject } from '../lib/types.ts';
import { generateRoomCode, calculateAverage, calculateFinalScore, calculateTier, normalizeStage } from '../lib/utils.ts';

const rooms = new Map<string, Room>();

export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('create-room', ({ roomName, hostName, sessionId }) => {
      const code = generateRoomCode();
      const room: Room = {
        code,
        name: roomName,
        host: hostName,
        hostSocketId: socket.id,
        panelists: [],
        projects: [],
        currentProjectIndex: -1,
        currentStage: 'guess',
        votes: {
          firstImpression: new Map(),
          design: new Map(),
          clarity: new Map(),
          value: new Map(),
          potential: new Map(),
          stageGuess: new Map(),
        },
        revealed: {
          firstImpression: false,
          design: false,
          clarity: false,
          value: false,
          potential: false,
          stageGuess: false,
        },
        reviewedProjects: [],
      };

      rooms.set(code, room);
      socket.join(code);
      socket.emit('room-created', { code, room });
      console.log(`Room created: ${code} by ${hostName} (ID: ${sessionId})`);
    });

    socket.on('join-room', ({ roomCode, panelistName, sessionId }) => {
      const room = rooms.get(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      let panelist = room.panelists.find((p) => p.id === sessionId);
      
      if (panelist) {
        // Rejoining
        panelist.socketId = socket.id;
        console.log(`${panelistName} (ID: ${sessionId}) rejoined room ${roomCode}`);
      } else {
        // New join
        panelist = {
          id: sessionId || socket.id,
          name: panelistName,
          socketId: socket.id,
          score: 0,
        };
        room.panelists.push(panelist);
        console.log(`${panelistName} joined room ${roomCode}`);
      }

      socket.join(roomCode);
      io.to(roomCode).emit('room-state', serializeRoom(room));
    });

    socket.on('upload-csv', ({ roomCode, projects }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) {
        socket.emit('error', { message: 'Unauthorized or room not found' });
        return;
      }

      room.projects = projects;
      room.currentProjectIndex = 0;
      room.currentStage = 'guess';

      io.to(roomCode).emit('room-state', serializeRoom(room));
      console.log(`CSV uploaded to room ${roomCode}: ${projects.length} projects`);
    });

    socket.on('next-stage', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) {
        socket.emit('error', { message: 'Unauthorized or room not found' });
        return;
      }

      const stages: Room['currentStage'][] = [
        'guess',
        'reveal',
        'open',
        'first-impression',
        'landing-review',
        'product-review',
        'stage-guess',
        'completed',
      ];

      const currentIndex = stages.indexOf(room.currentStage);
      if (currentIndex < stages.length - 1) {
        room.currentStage = stages[currentIndex + 1];

        if (room.currentStage === 'open') {
          setTimeout(() => {
            room.currentStage = 'first-impression';
            io.to(roomCode).emit('room-state', serializeRoom(room));
          }, 1000);
        }
      }

      io.to(roomCode).emit('room-state', serializeRoom(room));
      console.log(`Room ${roomCode} advanced to stage: ${room.currentStage}`);
    });

    socket.on('submit-vote', ({ roomCode, category, value }) => {
      const room = rooms.get(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const panelist = room.panelists.find((p) => p.socketId === socket.id);
      if (!panelist) {
        socket.emit('error', { message: 'Panelist not found' });
        return;
      }

      if (category === 'firstImpression') {
        room.votes.firstImpression.set(panelist.id, value as number);
        if (room.votes.firstImpression.size === room.panelists.length) {
          room.revealed.firstImpression = true;
        }
      } else if (category === 'design') {
        room.votes.design.set(panelist.id, value as number);
        if (room.votes.design.size === room.panelists.length) {
          room.revealed.design = true;
        }
      } else if (category === 'clarity') {
        room.votes.clarity.set(panelist.id, value as number);
        if (room.votes.clarity.size === room.panelists.length) {
          room.revealed.clarity = true;
        }
      } else if (category === 'value') {
        room.votes.value.set(panelist.id, value as number);
        if (room.votes.value.size === room.panelists.length) {
          room.revealed.value = true;
        }
      } else if (category === 'potential') {
        room.votes.potential.set(panelist.id, value as number);
        if (room.votes.potential.size === room.panelists.length) {
          room.revealed.potential = true;
        }
      } else if (category === 'stageGuess') {
        room.votes.stageGuess.set(panelist.id, value as string);
        if (room.votes.stageGuess.size === room.panelists.length) {
          room.revealed.stageGuess = true;
        }
      }

      io.to(roomCode).emit('room-state', serializeRoom(room));
      console.log(`Vote submitted in room ${roomCode}: ${category} = ${value}`);
    });

    socket.on('award-points', ({ roomCode, panelistId, points }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) {
        socket.emit('error', { message: 'Unauthorized or room not found' });
        return;
      }

      const panelist = room.panelists.find((p) => p.id === panelistId);
      if (panelist) {
        panelist.score += points;
        io.to(roomCode).emit('room-state', serializeRoom(room));
        console.log(`Awarded ${points} points to ${panelist.name} in room ${roomCode}`);
      }
    });

    socket.on('award-stage-guess-points', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) {
        socket.emit('error', { message: 'Unauthorized or room not found' });
        return;
      }

      const currentProject = room.projects[room.currentProjectIndex];
      if (!currentProject) return;

      room.votes.stageGuess.forEach((guess, panelistId) => {
        if (normalizeStage(guess) === normalizeStage(currentProject.stage)) {
          const panelist = room.panelists.find((p) => p.id === panelistId);
          if (panelist) {
            panelist.score += 25;
          }
        }
      });

      io.to(roomCode).emit('room-state', serializeRoom(room));
      console.log(`Stage guess points awarded in room ${roomCode}`);
    });

    socket.on('next-project', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) {
        socket.emit('error', { message: 'Unauthorized or room not found' });
        return;
      }

      const currentProject = room.projects[room.currentProjectIndex];
      if (currentProject) {
        const reviewedProject: ReviewedProject = {
          project: currentProject,
          votes: {
            firstImpression: Array.from(room.votes.firstImpression.values()),
            design: Array.from(room.votes.design.values()),
            clarity: Array.from(room.votes.clarity.values()),
            value: Array.from(room.votes.value.values()),
            potential: Array.from(room.votes.potential.values()),
          },
          averages: {
            firstImpression: calculateAverage(Array.from(room.votes.firstImpression.values())),
            design: calculateAverage(Array.from(room.votes.design.values())),
            clarity: calculateAverage(Array.from(room.votes.clarity.values())),
            value: calculateAverage(Array.from(room.votes.value.values())),
            potential: calculateAverage(Array.from(room.votes.potential.values())),
            final: 0,
          },
          tier: 'F',
          stageGuesses: Object.fromEntries(room.votes.stageGuess),
          correctGuesses: [],
        };

        reviewedProject.averages.final = calculateFinalScore(reviewedProject.averages);
        reviewedProject.tier = calculateTier(reviewedProject.averages.final);

        room.reviewedProjects.push(reviewedProject);
      }

      room.votes.firstImpression.clear();
      room.votes.design.clear();
      room.votes.clarity.clear();
      room.votes.value.clear();
      room.votes.potential.clear();
      room.votes.stageGuess.clear();

      room.revealed = {
        firstImpression: false,
        design: false,
        clarity: false,
        value: false,
        potential: false,
        stageGuess: false,
      };

      room.currentProjectIndex++;
      room.currentStage = 'guess';

      io.to(roomCode).emit('room-state', serializeRoom(room));
      console.log(`Room ${roomCode} moved to next project`);
    });

    socket.on('reset-room', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) {
        socket.emit('error', { message: 'Unauthorized or room not found' });
        return;
      }

      room.projects = [];
      room.currentProjectIndex = -1;
      room.currentStage = 'guess';
      room.reviewedProjects = [];
      room.panelists.forEach((p) => (p.score = 0));

      room.votes.firstImpression.clear();
      room.votes.design.clear();
      room.votes.clarity.clear();
      room.votes.value.clear();
      room.votes.potential.clear();
      room.votes.stageGuess.clear();

      io.to(roomCode).emit('room-state', serializeRoom(room));
      console.log(`Room ${roomCode} reset`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      rooms.forEach((room, code) => {
        if (room.hostSocketId === socket.id) {
          io.to(code).emit('error', { message: 'Host disconnected. Room closed.' });
          rooms.delete(code);
          console.log(`Room ${code} deleted (host disconnected)`);
        } else {
          // We don't remove panelists anymore to allow rejoining with same sessionId
          const panelist = room.panelists.find((p) => p.socketId === socket.id);
          if (panelist) {
            console.log(`${panelist.name} disconnected from room ${code}`);
          }
        }
      });
    });
  });

  return io;
}

function serializeRoom(room: Room) {
  return {
    ...room,
    votes: {
      firstImpression: Array.from(room.votes.firstImpression.entries()),
      design: Array.from(room.votes.design.entries()),
      clarity: Array.from(room.votes.clarity.entries()),
      value: Array.from(room.votes.value.entries()),
      potential: Array.from(room.votes.potential.entries()),
      stageGuess: Array.from(room.votes.stageGuess.entries()),
    },
  };
}
