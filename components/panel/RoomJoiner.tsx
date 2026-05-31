'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RoomJoinerProps {
  onRoomJoined: (code: string) => void;
  panelistName: string;
}

export default function RoomJoiner({ onRoomJoined, panelistName }: RoomJoinerProps) {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = () => {
    if (roomCode.trim()) {
      onRoomJoined(roomCode.toUpperCase());
    }
  };

  return (
    <div className="neo-card bg-[#00BCD4] max-w-2xl mx-auto">
      <h2 className="text-5xl font-black uppercase mb-6 text-center">
        Join Room
      </h2>

      <p className="text-2xl font-bold text-center mb-6">
        Welcome, {panelistName}!
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="roomCode" className="text-xl font-black uppercase mb-2 block">
            Room Code
          </Label>
          <Input
            id="roomCode"
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="neo-input w-full uppercase"
            placeholder="ABCD123"
            maxLength={10}
          />
        </div>

        <Button
          onClick={handleJoin}
          disabled={!roomCode.trim()}
          className="neo-button bg-[#E91E63] hover:bg-[#E91E63] w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Join Room
        </Button>
      </div>
    </div>
  );
}
