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

        // Get all existing projects from all other rooms to check for duplicates
        const allOtherRooms = await Room.find({ code: { $ne: roomCode } });
        const existingUrls = new Set();
        const normalizeUrl = (urlStr: string) => {
          if (!urlStr) return '';
          try {
            // Remove protocol, www, and trailing slash
            let normalized = urlStr.toLowerCase().trim();
            normalized = normalized.replace(/^https?:\/\//, '');
            normalized = normalized.replace(/^www\./, '');
            normalized = normalized.replace(/\/$/, '');
            return normalized;
          } catch (e) {
            return urlStr.toLowerCase().trim();
          }
        };

        allOtherRooms.forEach(r => {
          r.projects.forEach((p: any) => {
            if (p.url) existingUrls.add(normalizeUrl(p.url));
          });
          r.reviewedProjects.forEach((rp: any) => {
            if (rp.project?.url) existingUrls.add(normalizeUrl(rp.project.url));
          });
        });

        const projectsWithDuplicateCheck = projects.map((p: any) => {
          const normalized = normalizeUrl(p.url);
          const isDuplicate = p.url ? existingUrls.has(normalized) : false;
          return {
            ...p,
            isDuplicate,
            isApproved: !isDuplicate // Auto-approve if not a duplicate
          };
        });

        room.projects = projectsWithDuplicateCheck;
        room.currentProjectIndex = -1;
        room.currentStage = 'guess';
        await room.save();

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`CSV uploaded to room ${roomCode}: ${projects.length} projects (with duplicate check)`);
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

        const allowed = ['url', 'description', 'stage', 'launched', 'struggling', 'credentials', 'submissionId', 'submittedAt', 'isApproved'];
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

    socket.on('approve-project', async ({ roomCode, projectId }) => {
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

        room.projects[idx].isApproved = true;
        room.markModified('projects');
        await room.save();

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Project ${projectId} approved in room ${roomCode}`);
      } catch (error) {
        console.error('Approve project error:', error);
        socket.emit('error', { message: 'Failed to approve project' });
      }
    });

    socket.on('start-review', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        // Filter out unapproved projects
        const approvedProjects = room.projects.filter((p: any) => p.isApproved !== false);
        if (!approvedProjects.length) {
          socket.emit('error', { message: 'No approved projects to review' });
          return;
        }

        room.projects = approvedProjects;
        room.currentProjectIndex = 0;
        room.currentStage = 'guess';
        await room.save();

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Review started in room ${roomCode} with ${approvedProjects.length} projects`);
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
          'struggle-guess',
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
        room.struggleGuessPointsAwarded = false;
        room.forceReveal = false;
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

    socket.on('kick-panelist', async ({ roomCode, panelistId }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }

        const kicked = room.panelists.find((p) => p.panelistId === panelistId);
        if (!kicked) return;

        room.panelists = room.panelists.filter((p) => p.panelistId !== panelistId) as typeof room.panelists;

        await Vote.deleteMany({ roomId: room._id.toString(), panelistId });

        // Recalculate averages for every already-reviewed project excluding kicked panelist
        for (let i = 0; i < room.reviewedProjects.length; i++) {
          const reviewed = room.reviewedProjects[i];
          const votes = await Vote.find({
            roomId: room._id.toString(),
            projectId: reviewed.project.id,
          });

          const votesByCategory: any = { firstImpression: [], design: [], clarity: [], value: [], potential: [] };
          const stageGuesses: Record<string, string> = {};

          votes.forEach((vote) => {
            if (vote.category === 'stageGuess') {
              stageGuesses[vote.panelistId] = vote.value as string;
            } else if (votesByCategory[vote.category]) {
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

          room.reviewedProjects[i] = {
            ...reviewed,
            votes: votesByCategory,
            averages,
            tier: calculateTier(averages.final),
            stageGuesses,
            correctGuesses: Object.entries(stageGuesses)
              .filter(([, guess]) => guess === reviewed.project.stage)
              .map(([pid]) => pid),
          };
        }

        room.markModified('reviewedProjects');
        await room.save();

        // Notify kicked panelist's socket if still connected
        if (kicked.socketId) {
          io.to(kicked.socketId).emit('kicked', { message: 'You have been removed from the room.' });
        }

        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Panelist ${panelistId} kicked from room ${roomCode}`);
      } catch (error) {
        console.error('Kick panelist error:', error);
        socket.emit('error', { message: 'Failed to kick panelist' });
      }
    });

    socket.on('force-reveal', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode, isActive: true });
        if (!room || room.hostSocketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized or room not found' });
          return;
        }
        room.forceReveal = true;
        await room.save();
        io.to(roomCode).emit('room-state', await serializeRoomWithVotes(room));
        console.log(`Force reveal triggered in room ${roomCode}`);
      } catch (error) {
        console.error('Force reveal error:', error);
        socket.emit('error', { message: 'Failed to force reveal' });
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
    forceReveal: room.forceReveal || false,
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
    struggleGuess: [],
  };

  let revealed: Record<string, boolean> = {
    firstImpression: false,
    design: false,
    clarity: false,
    value: false,
    potential: false,
    stageGuess: false,
    struggleGuess: false,
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
      struggleGuess: new Map(),
    };

    voteRecords.forEach((vote) => {
      if (votesByCategory[vote.category]) {
        votesByCategory[vote.category].set(vote.panelistId, vote.value);
      }
    });

    Object.keys(votesByCategory).forEach((category) => {
      votes[category] = Array.from(votesByCategory[category].entries());
      revealed[category] = room.forceReveal
        ? votesByCategory[category].size > 0
        : room.panelists.length > 0 && votesByCategory[category].size === room.panelists.length;
    });

    // Auto-award stage-guess points (10 pts) when all panelists have voted
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
            panelist.score += 10;
          }
        }
      });
      room.stageGuessPointsAwarded = true;
      await room.save();
    }

    // Auto-award struggle-guess points (15 pts) when all panelists have voted
    if (
      room.currentStage === 'struggle-guess' &&
      revealed['struggleGuess'] &&
      !room.struggleGuessPointsAwarded
    ) {
      const struggleGuessVotes = votesByCategory['struggleGuess'];
      struggleGuessVotes.forEach((guess: string, panelistId: string) => {
        if (guess && normalizeStage(guess) === normalizeStage(currentProject.struggling)) {
          const panelist = room.panelists.find((p: any) => p.panelistId === panelistId);
          if (panelist) {
            panelist.score += 15;
          }
        }
      });
      room.struggleGuessPointsAwarded = true;
      await room.save();
    }
  }

  return {
    ...serializeRoom(room),
    votes,
    revealed,
  };
}
