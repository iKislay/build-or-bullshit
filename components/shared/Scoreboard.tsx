'use client';

import { useRoomStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';

export default function Scoreboard({ compact = false }: { compact?: boolean }) {
  const room = useRoomStore((state) => state.room);

  if (!room || room.panelists.length === 0) {
    return null;
  }

  const sortedPanelists = [...room.panelists].sort((a, b) => b.score - a.score);

  const hasVoted = (panelistId: string) => {
    const { currentStage, votes } = room;
    if (currentStage === 'first-impression') return votes.firstImpression.has(panelistId);
    if (currentStage === 'landing-review') {
      // For landing review, show voted if they've voted for any of the 3 categories
      // OR only show if they've voted for ALL? Let's say ANY for now.
      return votes.design.has(panelistId) || votes.clarity.has(panelistId) || votes.value.has(panelistId);
    }
    if (currentStage === 'product-review') return votes.potential.has(panelistId);
    if (currentStage === 'stage-guess') return votes.stageGuess.has(panelistId);
    return false;
  };

  if (compact) {
    return (
      <div className="fixed bottom-4 right-4 z-50 border-2 border-black bg-white p-2 text-sm min-w-[150px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="font-black uppercase mb-1 text-center text-[10px] text-gray-500">Scoreboard</h3>
        <div className="space-y-1">
          {sortedPanelists.map((panelist, index) => (
            <div key={panelist.panelistId} className="flex justify-between items-center text-xs">
              <span className="font-bold truncate mr-3 max-w-[100px]" title={panelist.name}>
                {index + 1}. {panelist.name}
              </span>
              <span className="font-black whitespace-nowrap">{panelist.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="neo-card bg-white">
      <h3 className="text-3xl font-black uppercase mb-4 text-center">
        Scoreboard
      </h3>

      <div className="space-y-3">
        {sortedPanelists.map((panelist, index) => (
          <div
            key={panelist.panelistId}
            className="border-4 border-black p-4 flex items-center justify-between bg-[#FFEB3B]"
          >
            <div className="flex items-center gap-4">
              <Badge className="text-2xl font-black px-4 py-2 bg-black text-white border-0">
                #{index + 1}
              </Badge>
              <div className="flex flex-col">
                <span className="text-2xl font-black">{panelist.name}</span>
                {hasVoted(panelist.panelistId) && (
                  <span className="text-xs font-black uppercase bg-[#4CAF50] text-white px-2 py-0.5 inline-block w-fit">
                    Voted ✓
                  </span>
                )}
              </div>
            </div>
            <span className="text-3xl font-black">{panelist.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
