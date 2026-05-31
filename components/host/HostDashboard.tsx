'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useRoomStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import RoomCreator from './RoomCreator';
import CSVUploader from './CSVUploader';
import ReviewInterface from './ReviewInterface';
import StageTransition from '../shared/StageTransition';
import { Room } from '@/lib/types';

export default function HostDashboard() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const { room, setRoom } = useRoomStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const storedSession = sessionStorage.getItem('session');
    if (!storedSession) {
      router.push('/');
      return;
    }

    const parsedSession = JSON.parse(storedSession);
    if (parsedSession.role !== 'host') {
      router.push('/');
      return;
    }

    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('room-created', ({ code, room: createdRoom }) => {
      console.log('Room created:', code);
      setRoom(deserializeRoom(createdRoom));
    });

    socket.on('room-state', (roomState) => {
      console.log('Room state updated');
      setRoom(deserializeRoom(roomState));
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room-created');
      socket.off('room-state');
      socket.off('error');
    };
  }, [router, setRoom]);

  const handleRoomCreated = (code: string, roomName: string) => {
    const storedSession = sessionStorage.getItem('session');
    if (!storedSession) return;
    const parsedSession = JSON.parse(storedSession);

    const socket = getSocket();
    socket.emit('create-room', { 
      roomName, 
      hostName: parsedSession.name,
      sessionId: parsedSession.sessionId 
    });
  };

  const handleCSVUploaded = (projects: any[]) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('upload-csv', { roomCode: room.code, projects });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FF9800]">
        <div className="neo-card bg-white">
          <h2 className="text-4xl font-black uppercase">Connecting...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FF9800] p-4">
      {!room && <RoomCreator onRoomCreated={handleRoomCreated} />}

      {room && !room.projects.length && (
        <div className="space-y-6">
          <div className="neo-card bg-white max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-black uppercase mb-2">Room Created!</h2>
            <p className="text-xl font-bold mb-4">Room Code:</p>
            <div className="text-6xl font-black bg-[#FFEB3B] border-4 border-black p-6 inline-block">
              {room.code}
            </div>
            <p className="text-lg font-bold mt-4">
              Share this code with panelists
            </p>
          </div>
          <CSVUploader onCSVUploaded={handleCSVUploaded} />
        </div>
      )}

      {room && room.projects.length > 0 && (
        <>
          <StageTransition stage={room.currentStage} />
          <ReviewInterface />
        </>
      )}
    </div>
  );
}

function deserializeRoom(roomState: any): Room {
  return {
    ...roomState,
    votes: {
      firstImpression: new Map(roomState.votes.firstImpression),
      design: new Map(roomState.votes.design),
      clarity: new Map(roomState.votes.clarity),
      value: new Map(roomState.votes.value),
      potential: new Map(roomState.votes.potential),
      stageGuess: new Map(roomState.votes.stageGuess),
    },
  };
}
