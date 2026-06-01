'use client';

import { useState, useEffect } from 'react';
import { useRoomStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import Scoreboard from '@/components/shared/Scoreboard';
import AnimatedScoreReveal from '@/components/shared/AnimatedScoreReveal';
import VotingProgress from '@/components/shared/VotingProgress';
import { cn, normalizeStage } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const STAGE_OPTIONS = ['MVP', 'Launched', 'Revenue', 'Growing'];

const STRUGGLE_OPTIONS = [
  '100 users, 0% retention',
  '0 users, 100% confidence',
  'Traffic comes, money doesn\'t',
  'Nobody understands the value',
  'Finding product-market fit 🔍',
  'Everything. Please send help 🚨',
];

interface GuessRoundProps {
  title: string;
  subtitle: string;
  options: string[];
  category: 'stageGuess' | 'struggleGuess';
  correctValue: string;
  votes: [string, string][];
  revealed: boolean;
  panelists: { panelistId: string; name: string }[];
  hasVoted: boolean;
  onVote: (value: string) => void;
  myGuess: string;
  pointsLabel: string;
}

function GuessRound({
  title,
  subtitle,
  options,
  correctValue,
  votes,
  revealed,
  panelists,
  hasVoted,
  onVote,
  myGuess,
  pointsLabel,
}: GuessRoundProps) {
  return (
    <div className="neo-card bg-[#FF9800]">
      <h3 className="text-3xl font-black uppercase mb-1 text-center">{title}</h3>
      <p className="text-center font-bold text-black/70 mb-5">{subtitle}</p>

      {!hasVoted ? (
        /* ── VOTING PHASE ── */
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onVote(option)}
              className="w-full text-left px-5 py-4 bg-[#FFEB3B] border-4 border-black font-black text-base
                         shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                         hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5
                         active:shadow-none active:translate-y-0
                         transition-all duration-100"
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        /* ── VOTED / RESULTS PHASE ── */
        <div className="space-y-3">
          {options.map((option) => {
            const votersForOption = panelists.filter((p) => {
              const entry = votes.find(([id]) => id === p.panelistId);
              return entry?.[1] === option;
            });

            const isCorrect = revealed && normalizeStage(option) === normalizeStage(correctValue);
            const isMyChoice = option === myGuess;

            return (
              <div
                key={option}
                className={cn(
                  "relative border-4 border-black px-5 py-4 transition-all duration-[2000ms] ease-in-out",
                  isCorrect ? 'bg-[#4CAF50]' : 'bg-[#FFEB3B]',
                  isMyChoice && !isCorrect && revealed ? 'opacity-60' : ''
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={cn(
                    "font-black text-base transition-colors duration-[2000ms]",
                    isCorrect ? 'text-white' : 'text-black'
                  )}>
                    {option}
                    {isCorrect && <span className="ml-2 animate-in fade-in duration-[2000ms]">✓</span>}
                  </span>
                  {isMyChoice && (
                    <span className="text-xs font-black bg-black text-white px-2 py-1 shrink-0">
                      YOU
                    </span>
                  )}
                </div>

                {/* Panelist names inside the option */}
                {votersForOption.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {votersForOption.map((p) => (
                      <span
                        key={p.panelistId}
                        className={cn(
                          "text-xs font-bold px-2 py-0.5 border-2 border-black transition-colors duration-[2000ms]",
                          isCorrect ? 'bg-white text-[#4CAF50]' : 'bg-black text-[#FFEB3B]'
                        )}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className={cn(
                  "mt-1 overflow-hidden transition-all duration-[2000ms]",
                  isCorrect ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
                )}>
                  <span className="text-xs font-black text-white/80">{pointsLabel}</span>
                </div>
              </div>
            );
          })}

          {/* Waiting indicator */}
          {!revealed && (
            <VotingProgress
              panelists={panelists as any}
              votedIds={votes as any}
              label="Waiting for everyone to vote..."
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function PanelistReviewInterface() {
  const room = useRoomStore((state) => state.room);
  const setRoom = useRoomStore((state) => state.setRoom);
  const router = useRouter();
  const [stageGuess, setStageGuess] = useState('');
  const [struggleGuess, setStruggleGuess] = useState('');
  const [popupData, setPopupData] = useState<{ show: boolean; text: string }>({ show: false, text: '' });

  useEffect(() => {
    if (room?.currentStage === 'first-impression') {
      setPopupData({ show: true, text: 'First Impression Round' });
      const timer = setTimeout(() => setPopupData({ show: false, text: '' }), 4000);
      return () => clearTimeout(timer);
    } else if (room?.currentStage === 'product-review') {
      setPopupData({ show: true, text: 'Does this project have potential?' });
      const timer = setTimeout(() => setPopupData({ show: false, text: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [room?.currentStage]);

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

  const hasVoted = (category: 'firstImpression' | 'design' | 'clarity' | 'value' | 'potential' | 'stageGuess' | 'struggleGuess') => {
    const voteData = room.votes[category];
    if (!voteData) return false;
    return (voteData as any).has
      ? (voteData as Map<string, any>).has(panelistId)
      : Array.isArray(voteData)
        ? (voteData as [string, any][]).some(([id]) => id === panelistId)
        : false;
  };

  const handleSubmitVote = (category: string, value: number | string) => {
    socket.emit('submit-vote', { roomCode: room.code, category, value });
  };

  const handleStageGuessSubmit = (guess: string) => {
    handleSubmitVote('stageGuess', guess);
    setStageGuess(guess);
  };

  const handleStruggleGuessSubmit = (guess: string) => {
    handleSubmitVote('struggleGuess', guess);
    setStruggleGuess(guess);
  };

  const handleExitRoom = () => {
    if (confirm('Are you sure you want to exit the room?')) {
      sessionStorage.removeItem('panelistRoomCode');
      setRoom(null);
      router.push('/');
    }
  };

  // Normalize votes arrays for stage/struggle guess
  const stageVotesArr: [string, string][] = Array.isArray(room.votes.stageGuess)
    ? (room.votes.stageGuess as [string, string][])
    : room.votes.stageGuess
    ? Array.from((room.votes.stageGuess as Map<string, string>).entries())
    : [];

  const struggleVotesArr: [string, string][] = Array.isArray((room.votes as any).struggleGuess)
    ? ((room.votes as any).struggleGuess as [string, string][])
    : (room.votes as any).struggleGuess
    ? Array.from(((room.votes as any).struggleGuess as Map<string, string>).entries())
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {popupData.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/40">
          <div className="bg-[#FFEB3B] border-8 border-black p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transform -rotate-3">
            <h2 className="text-7xl font-black uppercase text-black text-center tracking-tighter">
              {popupData.text}
            </h2>
          </div>
        </div>
      )}
      <style>{`
        @keyframes correctPulse {
          0%, 100% { background-color: #4CAF50; }
          50% { background-color: #81C784; }
        }
        .correct-pulse {
          animation: correctPulse 0.8s ease-in-out infinite;
        }
      `}</style>

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
              {!room.revealed.firstImpression && (
                <VotingProgress panelists={room.panelists} votedIds={room.votes.firstImpression} label="Waiting for others..." />
              )}
              {room.revealed.firstImpression && (
                <AnimatedScoreReveal votes={room.votes.firstImpression} panelists={room.panelists} />
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
              {!room.revealed.potential && (
                <VotingProgress panelists={room.panelists} votedIds={room.votes.potential} label="Waiting for others..." />
              )}
              {room.revealed.potential && (
                <AnimatedScoreReveal votes={room.votes.potential} panelists={room.panelists} />
              )}
            </div>
          )}
        </div>
      )}

      {room.currentStage === 'stage-guess' && (
        <GuessRound
          title="Guess the Product Stage"
          subtitle="Where is this product right now?"
          options={STAGE_OPTIONS}
          category="stageGuess"
          correctValue={currentProject.stage}
          votes={stageVotesArr}
          revealed={room.revealed.stageGuess}
          panelists={room.panelists}
          hasVoted={hasVoted('stageGuess')}
          onVote={handleStageGuessSubmit}
          myGuess={stageGuess}
          pointsLabel="✓ +10 pts for correct guessers"
        />
      )}

      {room.currentStage === 'struggle-guess' && (
        <GuessRound
          title="Guess the Founder's Struggle"
          subtitle="What is this founder struggling with?"
          options={STRUGGLE_OPTIONS}
          category="struggleGuess"
          correctValue={currentProject.struggling}
          votes={struggleVotesArr}
          revealed={(room.revealed as any).struggleGuess}
          panelists={room.panelists}
          hasVoted={hasVoted('struggleGuess')}
          onVote={handleStruggleGuessSubmit}
          myGuess={struggleGuess}
          pointsLabel="✓ +15 pts for correct guessers"
        />
      )}

      <Scoreboard compact />
    </div>
  );
}
