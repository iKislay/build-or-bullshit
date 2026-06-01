'use client';

import { useEffect, useState } from 'react';
import { Panelist } from '@/lib/types';
import { calculateAverage, normalizeStage } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AnimatedScoreRevealProps {
  votes: Map<string, number | string>;
  panelists: Panelist[];
  title?: string;
  isStageGuess?: boolean;
  correctStage?: string;
}

export default function AnimatedScoreReveal({
  votes,
  panelists,
  title,
  isStageGuess = false,
  correctStage,
}: AnimatedScoreRevealProps) {
  const [revealedIndex, setRevealedIndex] = useState<number>(-1);
  const [showAverage, setShowAverage] = useState(false);

  // Use Array.from just once to keep the order consistent
  const [voteEntries] = useState(() => Array.from(votes.entries()));
  
  useEffect(() => {
    if (voteEntries.length === 0) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < voteEntries.length) {
        setRevealedIndex(currentIndex);
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowAverage(true), 600);
      }
    }, 800); // 800ms per flip

    return () => clearInterval(interval);
  }, [voteEntries.length]);

  const average = !isStageGuess
    ? calculateAverage(voteEntries.map(([, score]) => score as number))
    : null;

  return (
    <div className="mt-4 pt-4 border-t-4 border-black w-full text-left">
      {title && <p className="text-xl font-black uppercase mb-4 text-center">{title}</p>}
      
      {isStageGuess && correctStage && (
        <div 
          className={cn(
            "transition-all duration-700 overflow-hidden",
            showAverage ? "max-h-40 opacity-100 mb-6" : "max-h-0 opacity-0 mb-0"
          )}
        >
          <p className="text-lg font-black uppercase mb-2 text-center">Correct Answer:</p>
          <div className="text-2xl font-black text-center bg-[#4CAF50] border-4 border-black p-4 shadow-brutal-sm text-white">
            {correctStage}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {voteEntries.map(([id, score], index) => {
          const panelist = panelists.find((p) => p.panelistId === id);
          const isRevealed = index <= revealedIndex;
          
          let isCorrect = false;
          if (isStageGuess && correctStage && isRevealed) {
            isCorrect = normalizeStage(score as string) === normalizeStage(correctStage);
          }

          if (isStageGuess) {
            return (
              <div key={id} className="relative w-full h-16 mb-2 shrink-0" style={{ perspective: '1000px' }}>
                <div 
                  className="w-full h-full relative transition-transform duration-700 ease-out" 
                  style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: isRevealed ? 'rotateX(180deg)' : 'rotateX(0deg)' 
                  }}
                >
                  <div 
                    className="absolute inset-0 w-full h-full bg-[#E91E63] border-4 border-black flex items-center justify-between px-4 shadow-brutal-sm" 
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="font-black text-xl text-white truncate">{panelist?.name || 'Unknown'}</span>
                    <span className="text-white font-black text-2xl">?</span>
                  </div>
                  <div 
                    className={cn(
                      "absolute inset-0 w-full h-full border-4 border-black flex items-center justify-between px-4 shadow-brutal-sm", 
                      isCorrect ? "bg-[#4CAF50] text-white" : "bg-[#FFEB3B]"
                    )} 
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
                  >
                    <span className="font-black text-xl truncate pr-4">{panelist?.name || 'Unknown'}</span>
                    <span className="font-black text-sm text-right truncate w-2/3">{score}</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div 
              key={id} 
              className={cn(
                "border-4 border-black p-3 flex justify-between items-center transition-colors duration-500",
                isRevealed ? "bg-white shadow-brutal-sm" : "bg-gray-200"
              )}
            >
              <span className="font-black text-xl truncate pr-4">
                {panelist?.name || 'Unknown'}
              </span>
              
              <div className="relative w-32 h-14 shrink-0" style={{ perspective: '1000px' }}>
                <div 
                  className="w-full h-full relative transition-transform duration-700 ease-out" 
                  style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: isRevealed ? 'rotateX(180deg)' : 'rotateX(0deg)' 
                  }}
                >
                  {/* Front (Unrevealed Card) */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-[#E91E63] border-4 border-black flex items-center justify-center shadow-brutal-sm"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="text-white font-black text-2xl">?</span>
                  </div>
                  {/* Back (Revealed Card) */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-[#FFEB3B] border-4 border-black flex items-center justify-center shadow-brutal-sm"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateX(180deg)' 
                    }}
                  >
                    <span className="font-black text-2xl">
                      {score}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isStageGuess && (
        <div 
          className={cn(
            "mt-6 pt-4 border-t-4 border-black transition-all duration-700 transform",
            showAverage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          <div className="flex justify-between items-center bg-[#00BCD4] border-4 border-black p-3 shadow-brutal">
            <span className="text-2xl font-black uppercase text-black">Average</span>
            <span className="text-3xl font-black text-white bg-black px-4 py-1 border-2 border-black">
              {average}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
