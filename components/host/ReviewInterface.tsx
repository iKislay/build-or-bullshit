'use client';

import { useRoomStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import ProjectDisplay from '@/components/shared/ProjectDisplay';
import Scoreboard from '@/components/shared/Scoreboard';
import AnimatedScoreReveal from '@/components/shared/AnimatedScoreReveal';
import VotingProgress from '@/components/shared/VotingProgress';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ReviewInterface() {
  const room = useRoomStore((state) => state.room);
  const setRoom = useRoomStore((state) => state.setRoom);
  const router = useRouter();
  const [popupData, setPopupData] = useState<{ show: boolean; text: string }>({ show: false, text: '' });

  useEffect(() => {
    if (room?.currentStage === 'first-impression') {
      setPopupData({ show: true, text: 'First Impression Round' });
      const timer = setTimeout(() => setPopupData({ show: false, text: '' }), 3000);
      return () => clearTimeout(timer);
    } else if (room?.currentStage === 'product-review') {
      setPopupData({ show: true, text: 'Does this project have potential?' });
      const timer = setTimeout(() => setPopupData({ show: false, text: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [room?.currentStage]);

  if (!room || room.currentProjectIndex < 0 || room.currentProjectIndex >= room.projects.length) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="neo-card bg-[#4CAF50] text-center">
          <h2 className="text-5xl font-black uppercase mb-4">All Projects Reviewed!</h2>
          <p className="text-2xl font-bold">Check the Tier Board</p>
        </div>
        <Scoreboard />
      </div>
    );
  }

  const currentProject = room.projects[room.currentProjectIndex];
  const socket = getSocket();

  const handleNextStage = () => {
    socket.emit('next-stage', { roomCode: room.code });
  };

  const handleOpenWebsite = () => {
    window.open(currentProject.url, '_blank');
    socket.emit('next-stage', { roomCode: room.code });
  };

  const handleAwardPoints = (panelistId: string) => {
    socket.emit('award-points', { roomCode: room.code, panelistId, points: 5 });
  };

  const handleNextProject = () => {
    window.open(`/tierboard?room=${room.code}`, 'tierboard');
    socket.emit('next-project', { roomCode: room.code });
  };

  const handleResetRoom = () => {
    if (confirm('Are you sure you want to reset the room? This will clear all progress.')) {
      socket.emit('reset-room', { roomCode: room.code });
    }
  };

  const handleExitRoom = () => {
    if (confirm('Are you sure you want to exit the room?')) {
      setRoom(null);
      router.push('/admin/dashboard');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {popupData.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/40">
          <div className="bg-[#FFEB3B] border-8 border-black p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transform -rotate-3 animate-bounce">
            <h2 className="text-7xl font-black uppercase text-black text-center tracking-tighter">
              {popupData.text}
            </h2>
          </div>
        </div>
      )}
      <div className="neo-card bg-white text-center relative">
        <Button
          onClick={handleExitRoom}
          className="neo-button bg-black hover:bg-black text-white absolute top-4 right-4 text-sm px-4 py-2"
        >
          Exit Room
        </Button>
        <h1 className="text-6xl font-black uppercase mb-2">Build or Bullsh*t</h1>
        <p className="text-2xl font-bold">
          Room: {room.code} | Project {room.currentProjectIndex + 1} of {room.projects.length}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProjectDisplay project={currentProject} stage={room.currentStage} isHost={true} />

          <div className="neo-card bg-[#E91E63]">
            <h3 className="text-3xl font-black uppercase mb-4 text-center">
              Stage: {room.currentStage.toUpperCase().replace('-', ' ')}
            </h3>

            <div className="space-y-3">
              {room.currentStage === 'guess' && (
                <Button
                  onClick={handleNextStage}
                  className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full"
                >
                  Reveal Description
                </Button>
              )}

              {room.currentStage === 'reveal' && (
                <>
                  <div className="border-4 border-black bg-white p-4">
                    <p className="font-black text-lg mb-3 text-center">Award Points (+5)</p>
                    <div className="space-y-2">
                      {room.panelists.map((panelist) => (
                        <Button
                          key={panelist.panelistId}
                          onClick={() => handleAwardPoints(panelist.panelistId)}
                          className="neo-button bg-[#FFEB3B] hover:bg-[#FFEB3B] w-full text-base"
                        >
                          {panelist.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleNextStage}
                    className="neo-button bg-[#00BCD4] hover:bg-[#00BCD4] w-full"
                  >
                    Continue to Open Website
                  </Button>
                </>
              )}

              {room.currentStage === 'open' && (
                <Button
                  onClick={handleOpenWebsite}
                  className="neo-button bg-[#9C27B0] hover:bg-[#9C27B0] w-full"
                >
                  Open Website
                </Button>
              )}

              {room.currentStage === 'first-impression' && (
                <>
                  {!room.revealed.firstImpression && (
                    <div className="border-4 border-black bg-white p-4">
                      <VotingProgress 
                        panelists={room.panelists} 
                        votedIds={room.votes.firstImpression} 
                        label="Waiting for First Impression votes..." 
                      />
                    </div>
                  )}
                  {room.revealed.firstImpression && (
                    <>
                      <AnimatedScoreReveal votes={room.votes.firstImpression} panelists={room.panelists} title="First Impression Results" />
                      <Button
                        onClick={handleNextStage}
                        className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full mt-4"
                      >
                        Continue to Landing Page Review
                      </Button>
                    </>
                  )}
                </>
              )}

              {room.currentStage === 'landing-review' && (
                <>
                  <div className="border-4 border-black bg-white p-4 space-y-4">
                    {!room.revealed.design ? (
                      <VotingProgress panelists={room.panelists} votedIds={room.votes.design} label="Design Votes" />
                    ) : (
                      <AnimatedScoreReveal votes={room.votes.design} panelists={room.panelists} title="Design Results" />
                    )}

                    {!room.revealed.clarity ? (
                      <VotingProgress panelists={room.panelists} votedIds={room.votes.clarity} label="Clarity Votes" />
                    ) : (
                      <AnimatedScoreReveal votes={room.votes.clarity} panelists={room.panelists} title="Clarity Results" />
                    )}

                    {!room.revealed.value ? (
                      <VotingProgress panelists={room.panelists} votedIds={room.votes.value} label="Value Votes" />
                    ) : (
                      <AnimatedScoreReveal votes={room.votes.value} panelists={room.panelists} title="Value Results" />
                    )}
                  </div>
                  {room.revealed.design && room.revealed.clarity && room.revealed.value && (
                    <Button
                      onClick={handleNextStage}
                      className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full mt-4"
                    >
                      Continue to Product Review
                    </Button>
                  )}
                </>
              )}

              {room.currentStage === 'product-review' && (
                <>
                  {!room.revealed.potential && (
                    <div className="border-4 border-black bg-white p-4">
                      <VotingProgress 
                        panelists={room.panelists} 
                        votedIds={room.votes.potential} 
                        label="Waiting for Potential votes..." 
                      />
                    </div>
                  )}
                  {room.revealed.potential && (
                    <>
                      <AnimatedScoreReveal votes={room.votes.potential} panelists={room.panelists} title="Potential Results" />
                      <Button
                        onClick={handleNextStage}
                        className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full mt-4"
                      >
                        Continue to Stage Guess
                      </Button>
                    </>
                  )}
                </>
              )}

              {room.currentStage === 'stage-guess' && (
                <>
                  {!room.revealed.stageGuess && (
                    <div className="border-4 border-black bg-white p-4">
                      <VotingProgress 
                        panelists={room.panelists} 
                        votedIds={room.votes.stageGuess} 
                        label="Waiting for stage guesses..." 
                      />
                    </div>
                  )}
                  {room.revealed.stageGuess && (
                    <>
                      <AnimatedScoreReveal 
                        votes={room.votes.stageGuess} 
                        panelists={room.panelists} 
                        title="Stage Guess Results" 
                        isStageGuess={true} 
                        correctStage={currentProject.stage} 
                      />
                      <Button
                        onClick={handleNextProject}
                        className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full mt-4"
                      >
                        Next Project
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Scoreboard />

          <div className="neo-card bg-[#F44336]">
            <Button
              onClick={handleResetRoom}
              className="neo-button bg-black hover:bg-black text-white w-full"
            >
              Reset Room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
