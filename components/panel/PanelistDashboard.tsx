'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useRoomStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import RoomJoiner from './RoomJoiner';
import PanelistReviewInterface from './PanelistReviewInterface';
import StageTransition from '../shared/StageTransition';
import { Room } from '@/lib/types';

export default function PanelistDashboard() {
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
    if (parsedSession.role !== 'panelist') {
      router.push('/');
      return;
    }

    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');

      // Auto-join room on connect
      if (parsedSession.roomCode && parsedSession.panelistId) {
        socket.emit('join-room', {
          roomCode: parsedSession.roomCode,
          panelistId: parsedSession.panelistId,
          panelistName: parsedSession.name
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('room-joined', () => {
      console.log('Successfully joined room');
    });

    socket.on('room-state', (roomState) => {
      console.log('Room state updated');
      setRoom(deserializeRoom(roomState));
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    socket.on('kicked', ({ message }: { message: string }) => {
      alert(message);
      setRoom(null);
      sessionStorage.removeItem('session');
      router.push('/');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room-joined');
      socket.off('room-state');
      socket.off('error');
      socket.off('kicked');
    };
  }, [router, setRoom]);

  const handleRoomJoined = (code: string) => {
    const storedSession = sessionStorage.getItem('session');
    if (!storedSession) return;

    const parsedSession = JSON.parse(storedSession);
    const socket = getSocket();
    socket.emit('join-room', {
      roomCode: parsedSession.roomCode || code,
      panelistId: parsedSession.panelistId,
      panelistName: parsedSession.name
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#9C27B0]">
        <div className="neo-card bg-white">
          <h2 className="text-4xl font-black uppercase">Connecting...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#9C27B0] p-4">
      {room && (
        <>
          <StageTransition stage={room.currentStage} />
          <PanelistReviewInterface />
        </>
      )}
    </div>
  );
}

function deserializeRoom(roomState: any): Room {
  return {
    ...roomState,
    votes: {
      firstImpression: new Map(roomState.votes?.firstImpression || []),
      design: new Map(roomState.votes?.design || []),
      clarity: new Map(roomState.votes?.clarity || []),
      value: new Map(roomState.votes?.value || []),
      potential: new Map(roomState.votes?.potential || []),
      stageGuess: new Map(roomState.votes?.stageGuess || []),
    },
    revealed: roomState.revealed || {
      firstImpression: false,
      design: false,
      clarity: false,
      value: false,
      potential: false,
      stageGuess: false,
    },
  };
}
