'use client';

import { useState } from 'react';
import { useRoomStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProjectDisplay from '@/components/shared/ProjectDisplay';
import Scoreboard from '@/components/shared/Scoreboard';
import { calculateAverage, normalizeStage } from '@/lib/utils';

export default function PanelistReviewInterface() {
  const room = useRoomStore((state) => state.room);
  const [firstImpression, setFirstImpression] = useState('');
  const [design, setDesign] = useState('');
  const [clarity, setClarity] = useState('');
  const [value, setValue] = useState('');
  const [potential, setPotential] = useState('');
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
  const socketId = socket.id;

  const hasVoted = (category: 'firstImpression' | 'design' | 'clarity' | 'value' | 'potential' | 'stageGuess') => {
    return room.votes[category].has(socketId || '');
  };

  const handleSubmitVote = (category: string, value: number | string) => {
    socket.emit('submit-vote', { roomCode: room.code, category, value });
  };

  const handleFirstImpressionSubmit = () => {
    const score = parseInt(firstImpression);
    if (score >= 1 && score <= 10) {
      handleSubmitVote('firstImpression', score);
      setFirstImpression('');
    }
  };

  const handleDesignSubmit = () => {
    const score = parseInt(design);
    if (score >= 1 && score <= 10) {
      handleSubmitVote('design', score);
      setDesign('');
    }
  };

  const handleClaritySubmit = () => {
    const score = parseInt(clarity);
    if (score >= 1 && score <= 10) {
      handleSubmitVote('clarity', score);
      setClarity('');
    }
  };

  const handleValueSubmit = () => {
    const score = parseInt(value);
    if (score >= 1 && score <= 10) {
      handleSubmitVote('value', score);
      setValue('');
    }
  };

  const handlePotentialSubmit = () => {
    const score = parseInt(potential);
    if (score >= 1 && score <= 10) {
      handleSubmitVote('potential', score);
      setPotential('');
    }
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="neo-card bg-white text-center">
        <h1 className="text-5xl font-black uppercase mb-2">Build or Bullsh*t</h1>
        <p className="text-xl font-bold">
          Project {room.currentProjectIndex + 1} of {room.projects.length}
        </p>
      </div>

      <ProjectDisplay project={currentProject} stage={room.currentStage} />

      {room.currentStage === 'guess' && (
        <div className="neo-card bg-[#FFEB3B] text-center">
          <h3 className="text-3xl font-black uppercase mb-2">Guess What It Does!</h3>
          <p className="text-xl font-bold">Discuss with the host</p>
        </div>
      )}

      {room.currentStage === 'reveal' && (
        <div className="neo-card bg-[#4CAF50] text-center">
          <h3 className="text-3xl font-black uppercase mb-2">Description Revealed!</h3>
          <p className="text-xl font-bold">Host will award points for correct guesses</p>
        </div>
      )}

      {room.currentStage === 'open' && (
        <div className="neo-card bg-[#9C27B0] text-center">
          <h3 className="text-3xl font-black uppercase mb-2">Opening Website...</h3>
          <p className="text-xl font-bold">Get ready to vote!</p>
        </div>
      )}

      {room.currentStage === 'first-impression' && (
        <div className="neo-card bg-[#00BCD4]">
          <h3 className="text-3xl font-black uppercase mb-4 text-center">
            First Impression Score
          </h3>

          {!hasVoted('firstImpression') ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xl font-black uppercase mb-2 block">
                  Rate 1-10
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={firstImpression}
                  onChange={(e) => setFirstImpression(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFirstImpressionSubmit()}
                  className="neo-input w-full text-center text-3xl"
                  placeholder="1-10"
                />
              </div>
              <Button
                onClick={handleFirstImpressionSubmit}
                disabled={!firstImpression || parseInt(firstImpression) < 1 || parseInt(firstImpression) > 10}
                className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full"
              >
                Submit Vote
              </Button>
            </div>
          ) : (
            <div className="border-4 border-black bg-white p-6 text-center">
              <p className="text-2xl font-black">Vote Submitted!</p>
              <p className="text-xl font-bold mt-2">Waiting for others...</p>
              {room.revealed.firstImpression && (
                <div className="mt-4 pt-4 border-t-4 border-black">
                  <p className="text-lg font-black uppercase mb-2">Results:</p>
                  <div className="space-y-2">
                    {Array.from(room.votes.firstImpression.entries()).map(([id, score]) => {
                      const panelist = room.panelists.find(p => p.id === id);
                      return (
                        <div key={id} className="flex justify-between">
                          <span className="font-bold">{panelist?.name || 'Unknown'}:</span>
                          <span className="font-black">{score}</span>
                        </div>
                      );
                    })}
                    <div className="border-t-4 border-black pt-2 mt-2">
                      <div className="flex justify-between text-xl">
                        <span className="font-black">Average:</span>
                        <span className="font-black">
                          {calculateAverage(Array.from(room.votes.firstImpression.values()))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={design}
                  onChange={(e) => setDesign(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDesignSubmit()}
                  className="neo-input w-full text-center text-3xl"
                  placeholder="1-10"
                />
                <Button
                  onClick={handleDesignSubmit}
                  disabled={!design || parseInt(design) < 1 || parseInt(design) > 10}
                  className="neo-button bg-[#E91E63] hover:bg-[#E91E63] w-full"
                >
                  Submit Design Score
                </Button>
              </div>
            ) : (
              <div className="border-4 border-black bg-white p-4 text-center">
                <p className="text-xl font-black">Design Vote Submitted!</p>
                {room.revealed.design && (
                  <div className="mt-4 pt-4 border-t-4 border-black">
                    <p className="font-black mb-2">Average: {calculateAverage(Array.from(room.votes.design.values()))}</p>
                  </div>
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
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={clarity}
                  onChange={(e) => setClarity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClaritySubmit()}
                  className="neo-input w-full text-center text-3xl"
                  placeholder="1-10"
                />
                <Button
                  onClick={handleClaritySubmit}
                  disabled={!clarity || parseInt(clarity) < 1 || parseInt(clarity) > 10}
                  className="neo-button bg-[#9C27B0] hover:bg-[#9C27B0] w-full"
                >
                  Submit Clarity Score
                </Button>
              </div>
            ) : (
              <div className="border-4 border-black bg-white p-4 text-center">
                <p className="text-xl font-black">Clarity Vote Submitted!</p>
                {room.revealed.clarity && (
                  <div className="mt-4 pt-4 border-t-4 border-black">
                    <p className="font-black mb-2">Average: {calculateAverage(Array.from(room.votes.clarity.values()))}</p>
                  </div>
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
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValueSubmit()}
                  className="neo-input w-full text-center text-3xl"
                  placeholder="1-10"
                />
                <Button
                  onClick={handleValueSubmit}
                  disabled={!value || parseInt(value) < 1 || parseInt(value) > 10}
                  className="neo-button bg-[#FF9800] hover:bg-[#FF9800] w-full"
                >
                  Submit Value Score
                </Button>
              </div>
            ) : (
              <div className="border-4 border-black bg-white p-4 text-center">
                <p className="text-xl font-black">Value Vote Submitted!</p>
                {room.revealed.value && (
                  <div className="mt-4 pt-4 border-t-4 border-black">
                    <p className="font-black mb-2">Average: {calculateAverage(Array.from(room.votes.value.values()))}</p>
                  </div>
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
              <Input
                type="number"
                min="1"
                max="10"
                value={potential}
                onChange={(e) => setPotential(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePotentialSubmit()}
                className="neo-input w-full text-center text-3xl"
                placeholder="1-10"
              />
              <Button
                onClick={handlePotentialSubmit}
                disabled={!potential || parseInt(potential) < 1 || parseInt(potential) > 10}
                className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full"
              >
                Submit Potential Score
              </Button>
            </div>
          ) : (
            <div className="border-4 border-black bg-white p-6 text-center">
              <p className="text-2xl font-black">Vote Submitted!</p>
              {room.revealed.potential && (
                <div className="mt-4 pt-4 border-t-4 border-black">
                  <p className="text-lg font-black uppercase mb-2">Results:</p>
                  <p className="text-xl font-black">
                    Average: {calculateAverage(Array.from(room.votes.potential.values()))}
                  </p>
                </div>
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
          ) : (
            <div className="border-4 border-black bg-white p-6">
              <p className="text-2xl font-black text-center mb-4">Vote Submitted!</p>
              <p className="text-lg font-bold text-center">Your guess: {stageGuess}</p>
              {room.revealed.stageGuess && (
                <div className="mt-4 pt-4 border-t-4 border-black">
                  <p className="text-lg font-black uppercase mb-2 text-center">Correct Answer:</p>
                  <p className="text-xl font-bold text-center bg-[#4CAF50] border-4 border-black p-4">
                    {currentProject.stage}
                  </p>
                  <div className="mt-4">
                    <p className="font-black mb-2">All Guesses:</p>
                    {Array.from(room.votes.stageGuess.entries()).map(([id, guess]) => {
                      const panelist = room.panelists.find(p => p.id === id);
                      const isCorrect = normalizeStage(guess) === normalizeStage(currentProject.stage);
                      return (
                        <div key={id} className={`p-2 border-2 border-black mb-2 ${isCorrect ? 'bg-[#4CAF50]' : 'bg-white'}`}>
                          <span className="font-bold">{panelist?.name}: </span>
                          <span className="font-bold">{guess}</span>
                          {isCorrect && <span className="font-black ml-2">✓ +25 pts</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Scoreboard />
    </div>
  );
}
