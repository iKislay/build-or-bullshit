'use client';

import { useRoomStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import ProjectDisplay from '@/components/shared/ProjectDisplay';
import Scoreboard from '@/components/shared/Scoreboard';

export default function ReviewInterface() {
  const room = useRoomStore((state) => state.room);

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

  const handleAwardStageGuessPoints = () => {
    socket.emit('award-stage-guess-points', { roomCode: room.code });
  };

  const handleNextProject = () => {
    socket.emit('next-project', { roomCode: room.code });
  };

  const handleResetRoom = () => {
    if (confirm('Are you sure you want to reset the room? This will clear all progress.')) {
      socket.emit('reset-room', { roomCode: room.code });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="neo-card bg-white text-center">
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
                          key={panelist.id}
                          onClick={() => handleAwardPoints(panelist.id)}
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
                  <div className="border-4 border-black bg-white p-4 text-center">
                    <p className="font-black text-xl">Waiting for First Impression votes...</p>
                    <p className="font-bold text-lg mt-2">
                      {room.votes.firstImpression.size} / {room.panelists.length} voted
                    </p>
                  </div>
                  {room.revealed.firstImpression && (
                    <Button
                      onClick={handleNextStage}
                      className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full"
                    >
                      Continue to Landing Page Review
                    </Button>
                  )}
                </>
              )}

              {room.currentStage === 'landing-review' && (
                <>
                  <div className="border-4 border-black bg-white p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black">Design:</span>
                      <span className="font-bold">
                        {room.votes.design.size} / {room.panelists.length}
                        {room.revealed.design && ' ✓'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-black">Clarity:</span>
                      <span className="font-bold">
                        {room.votes.clarity.size} / {room.panelists.length}
                        {room.revealed.clarity && ' ✓'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-black">Value:</span>
                      <span className="font-bold">
                        {room.votes.value.size} / {room.panelists.length}
                        {room.revealed.value && ' ✓'}
                      </span>
                    </div>
                  </div>
                  {room.revealed.design && room.revealed.clarity && room.revealed.value && (
                    <Button
                      onClick={handleNextStage}
                      className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full"
                    >
                      Continue to Product Review
                    </Button>
                  )}
                </>
              )}

              {room.currentStage === 'product-review' && (
                <>
                  <div className="border-4 border-black bg-white p-4 text-center">
                    <p className="font-black text-xl">Waiting for Potential votes...</p>
                    <p className="font-bold text-lg mt-2">
                      {room.votes.potential.size} / {room.panelists.length} voted
                    </p>
                  </div>
                  {room.revealed.potential && (
                    <Button
                      onClick={handleNextStage}
                      className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full"
                    >
                      Continue to Stage Guess
                    </Button>
                  )}
                </>
              )}

              {room.currentStage === 'stage-guess' && (
                <>
                  <div className="border-4 border-black bg-white p-4 text-center">
                    <p className="font-black text-xl">Waiting for stage guesses...</p>
                    <p className="font-bold text-lg mt-2">
                      {room.votes.stageGuess.size} / {room.panelists.length} voted
                    </p>
                  </div>
                  {room.revealed.stageGuess && (
                    <>
                      <Button
                        onClick={handleAwardStageGuessPoints}
                        className="neo-button bg-[#FFEB3B] hover:bg-[#FFEB3B] w-full"
                      >
                        Award Correct Answers (+25)
                      </Button>
                      <Button
                        onClick={handleNextProject}
                        className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full"
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
