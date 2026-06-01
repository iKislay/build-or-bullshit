'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Panelist {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
  code: string;
  panelistCount: number;
  projectCount: number;
  currentProjectIndex: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [activeTab, setActiveTab] = useState<'rooms' | 'panelists'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [newPanelistName, setNewPanelistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedSession = sessionStorage.getItem('session');
    if (!storedSession) {
      router.push('/admin');
      return;
    }

    const parsedSession = JSON.parse(storedSession);
    if (parsedSession.role !== 'host') {
      router.push('/admin');
      return;
    }

    fetchRooms();
    fetchPanelists();
  }, [router]);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms', {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const fetchPanelists = async () => {
    try {
      const response = await fetch('/api/panelists', {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      if (response.ok) {
        const data = await response.json();
        setPanelists(data);
      }
    } catch (err) {
      console.error('Failed to fetch panelists:', err);
    }
  };

  const handleCreatePanelist = async () => {
    if (!newPanelistName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/panelists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ name: newPanelistName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setPanelists([data, ...panelists]);
        setNewPanelistName('');
        alert(`Panelist created!\n\nName: ${data.name}\nCode: ${data.code}\n\nShare this code with the panelist.`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create panelist');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    router.push('/host');
  };

  const handleEnterRoom = (roomCode: string) => {
    router.push(`/host?room=${roomCode}`);
  };

  const handleDeleteRoom = async (roomCode: string, roomName: string) => {
    if (!confirm(`Delete room "${roomName}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/rooms?code=${roomCode}`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });

      if (response.ok) {
        setRooms(rooms.filter((r) => r.code !== roomCode));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete room');
      }
    } catch (err) {
      alert('Connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FF9800] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="neo-card bg-white">
          <h1 className="text-6xl font-black uppercase text-center mb-2">
            Admin Dashboard
          </h1>
          <p className="text-xl font-bold text-center">
            Welcome, Host!
          </p>
        </div>

        <div className="neo-card bg-[#FFEB3B]">
          <div className="flex gap-4 mb-6">
            <Button
              onClick={() => setActiveTab('rooms')}
              className={`neo-button flex-1 ${
                activeTab === 'rooms' ? 'bg-[#4CAF50]' : 'bg-white'
              }`}
            >
              Rooms
            </Button>
            <Button
              onClick={() => setActiveTab('panelists')}
              className={`neo-button flex-1 ${
                activeTab === 'panelists' ? 'bg-[#4CAF50]' : 'bg-white'
              }`}
            >
              Panelists
            </Button>
          </div>

          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <Button
                onClick={handleCreateRoom}
                className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full"
              >
                + Create New Room
              </Button>

              <div className="border-t-4 border-black pt-4">
                <h3 className="text-2xl font-black uppercase mb-4">Active Rooms</h3>
                {rooms.length === 0 ? (
                  <div className="border-4 border-black bg-white p-6 text-center">
                    <p className="font-bold text-gray-400">No active rooms</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className="border-4 border-black bg-white p-4 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xl font-black">{room.name}</h4>
                          <div className="flex gap-4 mt-2">
                            <Badge className="bg-black text-white border-0 font-bold">
                              Code: {room.code}
                            </Badge>
                            <Badge className="bg-[#00BCD4] text-black border-0 font-bold">
                              {room.panelistCount} Panelists
                            </Badge>
                            <Badge className="bg-[#E91E63] text-white border-0 font-bold">
                              {room.projectCount} Projects
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEnterRoom(room.code)}
                            className="neo-button bg-[#9C27B0] hover:bg-[#9C27B0]"
                          >
                            Enter Room
                          </Button>
                          <Button
                            onClick={() => handleDeleteRoom(room.code, room.name)}
                            className="neo-button bg-[#F44336] hover:bg-[#F44336]"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'panelists' && (
            <div className="space-y-4">
              <div className="border-4 border-black bg-white p-6">
                <h3 className="text-2xl font-black uppercase mb-4">Create Panelist</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-black uppercase mb-2 block">
                      Panelist Name
                    </Label>
                    <Input
                      type="text"
                      value={newPanelistName}
                      onChange={(e) => setNewPanelistName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreatePanelist()}
                      className="neo-input w-full"
                      placeholder="Enter name"
                    />
                  </div>

                  {error && (
                    <div className="border-4 border-black bg-[#F44336] text-white p-4 font-black text-center">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleCreatePanelist}
                    disabled={!newPanelistName.trim() || loading}
                    className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Panelist'}
                  </Button>
                </div>
              </div>

              <div className="border-t-4 border-black pt-4">
                <h3 className="text-2xl font-black uppercase mb-4">All Panelists</h3>
                {panelists.length === 0 ? (
                  <div className="border-4 border-black bg-white p-6 text-center">
                    <p className="font-bold text-gray-400">No panelists created yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {panelists.map((panelist) => (
                      <div
                        key={panelist.id}
                        className="border-4 border-black bg-white p-4 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xl font-black">{panelist.name}</h4>
                          <p className="text-sm font-bold text-gray-600 mt-1">
                            Created: {new Date(panelist.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="text-2xl font-black px-4 py-2 bg-[#E91E63] text-white border-0">
                          {panelist.code}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
