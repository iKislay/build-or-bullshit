import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import connectDB from '../lib/db/mongodb.ts';
import Room from '../models/Room.ts';
import Vote from '../models/Vote.ts';
import Panelist from '../models/Panelist.ts';
import { generateRoomCode, calculateAverage, calculateFinalScore, calculateTier, normalizeStage } from '../lib/utils.ts';

export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true
    },
  });

  connectDB();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('create-room', async ({ roomName, hostName, sessionId }) => {
      try {
        const code = generateRoomCode();

        const room = await Room.create({
          name: roomName,
          code,
          hostSocketId: socket.id,
          panelists: [],
          projects: [],
          currentProjectIndex: -1,
          currentStage: 'guess',
          reviewedProjects: [],
          isActive: true,
        });

        socket.join(code);
        const roomData = await serializeRoomWithVotes(room);
        socket.emit('room-created', { code, room: roomData });
        console.log(`Room created: ${code} by ${hostName}`);
      } catch (error) {
        console.error('Create room error:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    socket.on('rejoin-host', async ({ roomCode, hostName }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room) {
          socket.emit('error', { message: 'Room not found or no longer active' });
          return;
        }

        // Update host socket id so they regain control
        room.hostSocketId = socket.id;
        await room.save();

        socket.join(roomCode);
        const roomData = await serializeRoomWithVotes(room);
        socket.emit('room-state', roomData);
        console.log(`Host ${hostName} rejoined room ${roomCode}`);
      } catch (error) {
        console.error('Rejoin host error:', error);
        socket.emit('error', { message: 'Failed to rejoin room' });
      }
    });

    socket.on('join-room', async ({ roomCode, panelistId, panelistName }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const existingPanelist = room.panelists.find((p) => p.panelistId === panelistId);

        if (existingPanelist) {
          existingPanelist.socketId = socket.id;
        } else {
          room.panelists.push({
            panelistId,
            name: panelistName,
            socketId: socket.id,
            score: 0,
          });
        }

        await room.save();
        socket.join(roomCode);

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`${panelistName} joined room ${roomCode}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('spectate-room', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (room) {
          socket.join(roomCode);
          socket.emit('room-state', await serializeRoomWithVotes(room));
          console.log(`Spectator joined room ${roomCode}`);
        }
      } catch (error) {
        console.error('Spectate room error:', error);
      }
    });

    socket.on('upload-csv', async ({ roomCode, projects }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        room.projects = projects;
        room.currentProjectIndex = -1;
        room.currentStage = 'guess';
        await room.save();

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`CSV uploaded to room ${roomCode}: ${projects.length} projects (awaiting review start)`);
      } catch (error) {
        console.error('Upload CSV error:', error);
        socket.emit('error', { message: 'Failed to upload CSV' });
      }
    });

    socket.on('edit-project', async ({ roomCode, projectId, updates }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        const idx = room.projects.findIndex((p: any) => p.id === projectId);
        if (idx === -1) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        const allowed = ['url', 'description', 'stage', 'launched', 'struggling', 'credentials', 'submissionId', 'submittedAt'];
        const sanitized: Record<string, any> = {};
        for (const key of allowed) {
          if (key in updates) sanitized[key] = updates[key];
        }

        room.projects[idx] = { ...room.projects[idx], ...sanitized };
        room.markModified('projects');
        await room.save();

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Project ${projectId} edited in room ${roomCode}`);
      } catch (error) {
        console.error('Edit project error:', error);
        socket.emit('error', { message: 'Failed to edit project' });
      }
    });

    socket.on('delete-project', async ({ roomCode, projectId }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }
        if (room.currentProjectIndex >= 0) {
          socket.emit('error', { message: 'Cannot delete after review has started' });
          return;
        }

        room.projects = room.projects.filter((p: any) => p.id !== projectId);
        room.markModified('projects');
        await room.save();

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Project ${projectId} deleted from room ${roomCode}`);
      } catch (error) {
        console.error('Delete project error:', error);
        socket.emit('error', { message: 'Failed to delete project' });
      }
    });

    socket.on('start-review', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }
        if (!room.projects.length) {
          socket.emit('error', { message: 'No projects to review' });
          return;
        }

        room.currentProjectIndex = 0;
        room.currentStage = 'guess';
        await room.save();

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Review started in room ${roomCode}`);
      } catch (error) {
        console.error('Start review error:', error);
        socket.emit('error', { message: 'Failed to start review' });
      }
    });

    socket.on('next-stage', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        const stages = [
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
            setTimeout(async () => {
              room.currentStage = 'first-impression';
              await room.save();
              io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
            }, 1000);
          }
        }

        await room.save();
        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Room ${roomCode} advanced to stage: ${room.currentStage}`);
      } catch (error) {
        console.error('Next stage error:', error);
        socket.emit('error', { message: 'Failed to advance stage' });
      }
    });

    socket.on('submit-vote', async ({ roomCode, category, value }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const panelist = room.panelists.find((p) => p.socketId === socket.id);
        if (!panelist) {
          socket.emit('error', { message: 'Panelist not found' });
          return;
        }

        const currentProject = room.projects[room.currentProjectIndex];
        if (!currentProject) {
          socket.emit('error', { message: 'No current project' });
          return;
        }

        await Vote.findOneAndUpdate(
          {
            roomId: room._id.toString(),
            projectId: currentProject.id,
            panelistId: panelist.panelistId,
            category,
          },
          {
            value,
          },
          { upsert: true }
        );

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Vote submitted in room ${roomCode}: ${category} = ${value}`);
      } catch (error) {
        console.error('Submit vote error:', error);
        socket.emit('error', { message: 'Failed to submit vote' });
      }
    });

    socket.on('award-points', async ({ roomCode, panelistId, points }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        const panelist = room.panelists.find((p) => p.panelistId === panelistId);
        if (panelist) {
          panelist.score += points;
          await room.save();
          io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
          console.log(`Awarded ${points} points to ${panelist.name} in room ${roomCode}`);
        }
      } catch (error) {
        console.error('Award points error:', error);
        socket.emit('error', { message: 'Failed to award points' });
      }
    });

    socket.on('award-stage-guess-points', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        const currentProject = room.projects[room.currentProjectIndex];
        if (!currentProject) return;

        const votes = await Vote.find({
          roomId: room._id.toString(),
          projectId: currentProject.id,
          category: 'stageGuess',
        });

        votes.forEach((vote) => {
          if (vote.value === currentProject.stage) {
            const panelist = room.panelists.find((p) => p.panelistId === vote.panelistId);
            if (panelist) {
              panelist.score += 25;
            }
          }
        });

        await room.save();
        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Stage guess points awarded in room ${roomCode}`);
      } catch (error) {
        console.error('Award stage guess points error:', error);
        socket.emit('error', { message: 'Failed to award points' });
      }
    });

    socket.on('next-project', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        const currentProject = room.projects[room.currentProjectIndex];
        if (currentProject) {
          const votes = await Vote.find({
            roomId: room._id.toString(),
            projectId: currentProject.id,
          });

          const votesByCategory: any = {
            firstImpression: [],
            design: [],
            clarity: [],
            value: [],
            potential: [],
          };

          votes.forEach((vote) => {
            if (votesByCategory[vote.category]) {
              votesByCategory[vote.category].push(vote.value as number);
            }
          });

          const averages = {
            firstImpression: calculateAverage(votesByCategory.firstImpression),
            design: calculateAverage(votesByCategory.design),
            clarity: calculateAverage(votesByCategory.clarity),
            value: calculateAverage(votesByCategory.value),
            potential: calculateAverage(votesByCategory.potential),
            final: 0,
          };

          averages.final = calculateFinalScore(averages);
          const tier = calculateTier(averages.final);

          const stageGuesses: any = {};
          votes.filter((v) => v.category === 'stageGuess').forEach((v) => {
            stageGuesses[v.panelistId] = v.value;
          });

          const reviewedProject = {
            project: currentProject,
            votes: votesByCategory,
            averages,
            tier,
            stageGuesses,
            correctGuesses: Object.entries(stageGuesses)
              .filter(([_, guess]) => guess === currentProject.stage)
              .map(([panelistId]) => panelistId),
          };

          room.reviewedProjects.push(reviewedProject);
        }

        room.currentProjectIndex++;
        room.currentStage = 'guess';
        room.stageGuessPointsAwarded = false;
        await room.save();

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Room ${roomCode} moved to next project`);
      } catch (error) {
        console.error('Next project error:', error);
        socket.emit('error', { message: 'Failed to move to next project' });
      }
    });

    socket.on('reset-room', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        room.projects = [];
        room.currentProjectIndex = -1;
        room.currentStage = 'guess';
        room.reviewedProjects = [];
        room.panelists.forEach((p) => (p.score = 0));

        await room.save();
        await Vote.deleteMany({ roomId: room._id.toString() });

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Room ${roomCode} reset`);
      } catch (error) {
        console.error('Reset room error:', error);
        socket.emit('error', { message: 'Failed to reset room' });
      }
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);

      try {
        const panelistRooms = await Room.find({
          'panelists.socketId': socket.id,
          isActive: true,
        });

        for (const room of panelistRooms) {
          const panelistIndex = room.panelists.findIndex((p: any) => p.socketId === socket.id);
          if (panelistIndex !== -1) {
            const panelist = room.panelists[panelistIndex];
            panelist.socketId = '';
            await room.save();
            io.to(room.code).emit('room-state', await serializeRoomWithVotes(room));
            console.log(`${panelist.name} disconnected from room ${room.code} (kept in panelist list for reconnect)`);
          }
        }
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });

  return io;
}

function serializeRoom(room: any) {
  return {
    code: room.code,
    name: room.name,
    host: room.host || 'Host',
    hostSocketId: room.hostSocketId,
    panelists: room.panelists,
    projects: room.projects,
    currentProjectIndex: room.currentProjectIndex,
    currentStage: room.currentStage,
    reviewedProjects: room.reviewedProjects,
  };
}

async function serializeRoomWithVotes(room: any) {
  const currentProject = room.projects[room.currentProjectIndex];

  let votes: any = {
    firstImpression: [],
    design: [],
    clarity: [],
    value: [],
    potential: [],
    stageGuess: [],
  };

  let revealed = {
    firstImpression: false,
    design: false,
    clarity: false,
    value: false,
    potential: false,
    stageGuess: false,
  };

  if (currentProject) {
    const voteRecords = await Vote.find({
      roomId: room._id.toString(),
      projectId: currentProject.id,
    });

    const votesByCategory: any = {
      firstImpression: new Map(),
      design: new Map(),
      clarity: new Map(),
      value: new Map(),
      potential: new Map(),
      stageGuess: new Map(),
    };

    voteRecords.forEach((vote) => {
      if (votesByCategory[vote.category]) {
        votesByCategory[vote.category].set(vote.panelistId, vote.value);
      }
    });

    Object.keys(votesByCategory).forEach((category) => {
      votes[category] = Array.from(votesByCategory[category].entries());
      revealed[category] =
        room.panelists.length > 0 &&
        votesByCategory[category].size === room.panelists.length;
    });

    // Auto-award stage guess points when all panelists have voted
    if (
      room.currentStage === 'stage-guess' &&
      revealed['stageGuess'] &&
      !room.stageGuessPointsAwarded
    ) {
      const stageGuessVotes = votesByCategory['stageGuess'];
      stageGuessVotes.forEach((guess: string, panelistId: string) => {
        if (guess && normalizeStage(guess) === normalizeStage(currentProject.stage)) {
          const panelist = room.panelists.find((p: any) => p.panelistId === panelistId);
          if (panelist) {
            panelist.score += 5;
          }
        }
      });
      room.stageGuessPointsAwarded = true;
      await room.save();
    }
  }

  return {
    ...serializeRoom(room),
    votes,
    revealed,
  };
}
