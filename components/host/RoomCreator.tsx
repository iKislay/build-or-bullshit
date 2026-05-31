'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RoomCreatorProps {
  onRoomCreated: (code: string, roomName: string) => void;
}

export default function RoomCreator({ onRoomCreated }: RoomCreatorProps) {
  const [roomName, setRoomName] = useState('');

  const handleCreate = () => {
    if (roomName.trim()) {
      onRoomCreated('', roomName);
    }
  };

  return (
    <div className="neo-card bg-[#FFEB3B] max-w-2xl mx-auto">
      <h2 className="text-5xl font-black uppercase mb-6 text-center">
        Create Room
      </h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="roomName" className="text-xl font-black uppercase mb-2 block">
            Room Name
          </Label>
          <Input
            id="roomName"
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="neo-input w-full"
            placeholder="Friday Roast #1"
          />
        </div>

        <Button
          onClick={handleCreate}
          disabled={!roomName.trim()}
          className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Room
        </Button>
      </div>
    </div>
  );
}
