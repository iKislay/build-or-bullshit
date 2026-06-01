'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useRoomStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import RoomCreator from './RoomCreator';
import CSVUploader from './CSVUploader';
import ProjectEditor from './ProjectEditor';
import ReviewInterface from './ReviewInterface';
import StageTransition from '../shared/StageTransition';
import { Room } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function HostDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetRoomCode = searchParams.get('room');
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

    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to server');
    };
    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    };
    const onRoomCreated = ({ code, room: createdRoom }: any) => {
      console.log('Room created:', code);
      setRoom(deserializeRoom(createdRoom));
      router.replace(`/host?room=${code}`);
    };
    const onRoomState = (roomState: any) => {
      console.log('Room state updated');
      setRoom(deserializeRoom(roomState));
    };
    const onError = ({ message }: { message: string }) => {
      alert(message);
      if (
        message.includes('Room not found') ||
        message.includes('Room closed') ||
        message.includes('no longer active')
      ) {
        setRoom(null);
        router.replace('/host');
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-created', onRoomCreated);
    socket.on('room-state', onRoomState);
    socket.on('error', onError);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-created', onRoomCreated);
      socket.off('room-state', onRoomState);
      socket.off('error', onError);
    };
  }, [router, setRoom]);

  useEffect(() => {
    if (!isConnected) return;

    const storedSession = sessionStorage.getItem('session');
    if (!storedSession) return;
    const parsedSession = JSON.parse(storedSession);
    if (parsedSession.role !== 'host') return;

    if (targetRoomCode) {
      const socket = getSocket();
      console.log('Attempting to rejoin room:', targetRoomCode);
      socket.emit('rejoin-host', {
        roomCode: targetRoomCode,
        hostName: parsedSession.name,
      });
    } else {
      setRoom(null);
    }
  }, [isConnected, targetRoomCode, setRoom]);

  const handleRoomCreated = (code: string, roomName: string) => {
    const storedSession = sessionStorage.getItem('session');
    if (!storedSession) return;
    const parsedSession = JSON.parse(storedSession);

    const socket = getSocket();
    socket.emit('create-room', {
      roomName,
      hostName: parsedSession.name,
      sessionId: parsedSession.sessionId,
    });
  };

  const handleExitRoom = () => {
    if (confirm('Are you sure you want to exit the room?')) {
      setRoom(null);
      router.push('/admin/dashboard');
    }
  };

  const handleCSVUploaded = (projects: any[]) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('upload-csv', { roomCode: room.code, projects });
  };

  const handleStartReview = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('start-review', { roomCode: room.code });
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
          <div className="neo-card bg-white max-w-2xl mx-auto text-center relative">
            <Button
              onClick={handleExitRoom}
              className="neo-button bg-black hover:bg-black text-white absolute top-4 right-4 text-sm px-4 py-2"
            >
              Exit Room
            </Button>
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

      {room && room.projects.length > 0 && room.currentProjectIndex < 0 && (
        <div className="space-y-6">
          <div className="neo-card bg-white max-w-4xl mx-auto text-center relative">
            <Button
              onClick={handleExitRoom}
              className="neo-button bg-black hover:bg-black text-white absolute top-4 right-4 text-sm px-4 py-2"
            >
              Exit Room
            </Button>
            <h2 className="text-3xl font-black uppercase mb-2">{room.name}</h2>
            <p className="text-xl font-bold">Room Code: <span className="font-black">{room.code}</span></p>
          </div>
          <ProjectEditor
            roomCode={room.code}
            projects={room.projects}
            onStart={handleStartReview}
          />
        </div>
      )}

      {room && room.projects.length > 0 && room.currentProjectIndex >= 0 && (
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
