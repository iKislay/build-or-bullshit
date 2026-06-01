'use client';

import { Panelist } from '@/lib/types';
import { cn } from '@/lib/utils';

interface VotingProgressProps {
  panelists: Panelist[];
  votedIds: Set<string> | Map<string, any>;
  label?: string;
}

export default function VotingProgress({ panelists, votedIds, label = "Waiting for votes..." }: VotingProgressProps) {
  return (
    <div className="w-full">
      <p className="text-xl font-black uppercase mb-4 text-center">{label}</p>
      <div className="flex flex-wrap gap-4 justify-center">
        {panelists.map((p) => {
          const hasVoted = votedIds.has(p.panelistId);
          return (
            <div
              key={p.panelistId}
              className={cn(
                "border-4 border-black px-4 py-2 font-black transition-all duration-300 transform flex items-center gap-2",
                hasVoted
                  ? "bg-[#4CAF50] text-white shadow-brutal-sm scale-110"
                  : "bg-white text-gray-500 scale-100 opacity-80"
              )}
            >
              <span className="truncate max-w-[150px]">{p.name}</span>
              {hasVoted ? (
                <span className="text-xl animate-in zoom-in duration-300">✓</span>
              ) : (
                <span className="animate-pulse text-lg tracking-widest">...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
