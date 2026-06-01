'use client';

import { useState } from 'react';
import { useRoomStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Scoreboard from '@/components/shared/Scoreboard';
import AnimatedScoreReveal from '@/components/shared/AnimatedScoreReveal';
import VotingProgress from '@/components/shared/VotingProgress';
import { normalizeStage } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function PanelistReviewInterface() {
  const room = useRoomStore((state) => state.room);
  const setRoom = useRoomStore((state) => state.setRoom);
  const router = useRouter();
  const [stageGuess, setStageGuess] = useState('');

  if (!room || room.currentProjectIndex < 0 || room.currentProjectIndex >= room.projects.length) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
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
  const panelistId = typeof window !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('session') || '{}').panelistId
    : '';

  const hasVoted = (category: 'firstImpression' | 'design' | 'clarity' | 'value' | 'potential' | 'stageGuess') => {
    return room.votes[category].has(panelistId);
  };

  const handleSubmitVote = (category: string, value: number | string) => {
    socket.emit('submit-vote', { roomCode: room.code, category, value });
  };



  const handleStageGuessSubmit = (guess: string) => {
    handleSubmitVote('stageGuess', guess);
    setStageGuess(guess);
  };

  const stageOptions = [
    '0 users, 100% confidence',
    '100 users, 0% retention',
    'Traffic comes, money doesn\'t',
    'Finding product-market fit 🔍',
    'Nobody understands the value',
    'Everything. Please send help 🚨',
  ];

  const handleExitRoom = () => {
    if (confirm('Are you sure you want to exit the room?')) {
      sessionStorage.removeItem('panelistRoomCode');
      setRoom(null);
      router.push('/');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="neo-card bg-white text-center relative">
        <Button
          onClick={handleExitRoom}
          className="neo-button bg-black hover:bg-black text-white absolute top-4 right-4 text-sm px-4 py-2"
        >
          Exit Room
        </Button>
        <h1 className="text-5xl font-black uppercase mb-2">Build or Bullsh*t</h1>
        <p className="text-xl font-bold">
          Project {room.currentProjectIndex + 1} of {room.projects.length}
        </p>
      </div>

      {room.currentStage === 'guess' ? (
        <div className="neo-card bg-white text-center">
          <p className="text-2xl font-black uppercase mb-4 text-[#E91E63]">
            Guess what this project is about
          </p>
          <span className="text-4xl font-black break-all">
            {currentProject.url || 'No URL provided'}
          </span>
        </div>
      ) : (
        <div className="neo-card bg-white text-center space-y-4">
          <a
            href={currentProject.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-4xl font-black break-all hover:underline block text-[#E91E63]"
          >
            {currentProject.url || 'No URL provided'}
          </a>
          <p className="text-2xl font-bold text-black">
            {currentProject.description}
          </p>
        </div>
      )}

      {room.currentStage === 'first-impression' && (
        <div className="neo-card bg-[#00BCD4]">
          <h3 className="text-3xl font-black uppercase mb-4 text-center">
            First Impression Score
          </h3>

          {!hasVoted('firstImpression') ? (
            <div className="space-y-4">
              <Label className="text-2xl font-black uppercase mb-4 block text-center">
                Select Score (1-10)
              </Label>
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <Button
                    key={num}
                    onClick={() => handleSubmitVote('firstImpression', num)}
                    className="neo-button bg-white hover:bg-gray-200 text-black text-2xl font-black py-8"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-4 border-black bg-white p-6 text-center">
              <p className="text-2xl font-black mb-4">Vote Submitted!</p>
              {!room.revealed.firstImpression && (
                <VotingProgress panelists={room.panelists} votedIds={room.votes.firstImpression} label="Waiting for others..." />
              )}
              {room.revealed.firstImpression && (
                <AnimatedScoreReveal votes={room.votes.firstImpression} panelists={room.panelists} title="Results" />
              )}
            </div>
          )}
        </div>
      )}

      {room.currentStage === 'landing-review' && (
        <div className="space-y-6">
          <div className="neo-card bg-[#FFEB3B]">
            <h3 className="text-3xl font-black uppercase mb-4 text-center">
              Design Score
            </h3>
            {!hasVoted('design') ? (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Button
                      key={num}
                      onClick={() => handleSubmitVote('design', num)}
                      className="neo-button bg-white hover:bg-gray-200 text-black text-2xl font-black py-6"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-4 border-black bg-white p-4">
                <p className="text-xl font-black text-center mb-4">Design Vote Submitted!</p>
                {!room.revealed.design && (
                  <VotingProgress panelists={room.panelists} votedIds={room.votes.design} label="Waiting for others..." />
                )}
                {room.revealed.design && (
                  <AnimatedScoreReveal votes={room.votes.design} panelists={room.panelists} />
                )}
              </div>
            )}
          </div>

          <div className="neo-card bg-[#00BCD4]">
            <h3 className="text-3xl font-black uppercase mb-4 text-center">
              Clarity Score
            </h3>
            {!hasVoted('clarity') ? (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Button
                      key={num}
                      onClick={() => handleSubmitVote('clarity', num)}
                      className="neo-button bg-white hover:bg-gray-200 text-black text-2xl font-black py-6"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-4 border-black bg-white p-4">
                <p className="text-xl font-black text-center mb-4">Clarity Vote Submitted!</p>
                {!room.revealed.clarity && (
                  <VotingProgress panelists={room.panelists} votedIds={room.votes.clarity} label="Waiting for others..." />
                )}
                {room.revealed.clarity && (
                  <AnimatedScoreReveal votes={room.votes.clarity} panelists={room.panelists} />
                )}
              </div>
            )}
          </div>

          <div className="neo-card bg-[#4CAF50]">
            <h3 className="text-3xl font-black uppercase mb-4 text-center">
              Value Score
            </h3>
            {!hasVoted('value') ? (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Button
                      key={num}
                      onClick={() => handleSubmitVote('value', num)}
                      className="neo-button bg-white hover:bg-gray-200 text-black text-2xl font-black py-6"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-4 border-black bg-white p-4">
                <p className="text-xl font-black text-center mb-4">Value Vote Submitted!</p>
                {!room.revealed.value && (
                  <VotingProgress panelists={room.panelists} votedIds={room.votes.value} label="Waiting for others..." />
                )}
                {room.revealed.value && (
                  <AnimatedScoreReveal votes={room.votes.value} panelists={room.panelists} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {room.currentStage === 'product-review' && (
        <div className="neo-card bg-[#E91E63]">
          <h3 className="text-3xl font-black uppercase mb-4 text-center">
            Potential Score
          </h3>
          {!hasVoted('potential') ? (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <Button
                    key={num}
                    onClick={() => handleSubmitVote('potential', num)}
                    className="neo-button bg-white hover:bg-gray-200 text-black text-2xl font-black py-6"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-4 border-black bg-white p-6 text-center">
              <p className="text-2xl font-black mb-4">Vote Submitted!</p>
              {!room.revealed.potential && (
                <VotingProgress panelists={room.panelists} votedIds={room.votes.potential} label="Waiting for others..." />
              )}
              {room.revealed.potential && (
                <AnimatedScoreReveal votes={room.votes.potential} panelists={room.panelists} title="Results" />
              )}
            </div>
          )}
        </div>
      )}

      {room.currentStage === 'stage-guess' && (
        <div className="neo-card bg-[#FF9800]">
          <h3 className="text-3xl font-black uppercase mb-4 text-center">
            Guess the Product Stage
          </h3>
          {!hasVoted('stageGuess') ? (
            <div className="space-y-3">
              {stageOptions.map((option) => (
                <Button
                  key={option}
                  onClick={() => handleStageGuessSubmit(option)}
                  className="neo-button bg-[#FFEB3B] hover:bg-[#FFEB3B] w-full text-left justify-start text-base h-auto py-4"
                >
                  {option}
                </Button>
              ))}
            </div>
          ) : (() => {
            const revealed = room.revealed.stageGuess;
            const correctStageRaw = currentProject.stage;
            const correctStage = stageOptions.find(opt => normalizeStage(opt) === normalizeStage(correctStageRaw)) || correctStageRaw;
            const votesArr: [string, string][] = Array.isArray(room.votes.stageGuess)
              ? (room.votes.stageGuess as [string, string][])
              : Array.from((room.votes.stageGuess as Map<string, string>).entries());

            return (
              <div className="space-y-3">
                {!revealed ? (
                  <>
                    <div className="border-4 border-black bg-white p-3 text-center">
                      <p className="text-sm font-black uppercase opacity-60 mb-1">Your Guess</p>
                      <p className="text-lg font-black">{stageGuess}</p>
                    </div>
                    <VotingProgress panelists={room.panelists} votedIds={room.votes.stageGuess} label="Waiting for others..." />
                  </>
                ) : (
                  <>
                    {/* Correct answer pinned at top */}
                    <div className="border-4 border-black bg-[#4CAF50] p-4 text-center">
                      <p className="text-xs font-black uppercase text-white opacity-80 mb-1">✓ Correct Answer</p>
                      <p className="text-2xl font-black text-white">{correctStage}</p>
                    </div>

                    {/* All panelists' guesses */}
                    <div className="space-y-2">
                      {room.panelists.map((panelist) => {
                        const entry = votesArr.find(([id]) => id === panelist.panelistId);
                        const guess = entry?.[1];
                        const correct = guess && normalizeStage(guess) === normalizeStage(correctStageRaw);
                        return (
                          <div
                            key={panelist.panelistId}
                            className={`border-4 border-black p-3 flex items-center justify-between ${correct ? 'bg-[#4CAF50]' : 'bg-[#F44336]'}`}
                          >
                            <span className="font-black text-white text-base">{panelist.name}</span>
                            <div className="text-right">
                              <span className="font-bold text-white text-sm block">{guess || '—'}</span>
                              <span className="text-white font-black">{correct ? '✓ +5 pts' : ''}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <Scoreboard compact />
    </div>
  );
}
