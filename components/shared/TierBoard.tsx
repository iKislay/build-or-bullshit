'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { ReviewedProject, Project } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

function TierBoardDisplay() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room');
  const [reviewedProjects, setReviewedProjects] = useState<ReviewedProject[]>([]);
  const [unreviewedProjects, setUnreviewedProjects] = useState<Project[]>([]);

  useEffect(() => {
    const socket = getSocket();

    if (roomCode) {
      socket.emit('spectate-room', { roomCode });
    }

    socket.on('room-state', (roomState: any) => {
      setReviewedProjects(roomState.reviewedProjects || []);
      const totalProjects = roomState.projects?.length || 0;
      const currentIndex = roomState.currentProjectIndex || 0;
      
      // Projects that haven't been reviewed yet (including the current one)
      const reviewedIds = new Set((roomState.reviewedProjects || []).map((p: ReviewedProject) => p.project.id));
      const remaining = (roomState.projects || []).filter((p: Project) => !reviewedIds.has(p.id));
      
      setUnreviewedProjects(remaining);
    });

    return () => {
      socket.off('room-state');
    };
  }, [roomCode]);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url || 'Unknown URL';
    }
  };

  const tierColors: Record<string, string> = {
    S: '#FF7F7F',
    A: '#FFBF7F',
    B: '#FFFF7F',
    C: '#7FFF7F',
    D: '#7FBFFF',
    E: '#BF7FFF',
    F: '#FF7FFF',
  };

  const tiers = ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as const;

  const projectsByTier: Record<string, ReviewedProject[]> = {
    S: reviewedProjects.filter((p) => p.tier === 'S'),
    A: reviewedProjects.filter((p) => p.tier === 'A'),
    B: reviewedProjects.filter((p) => p.tier === 'B'),
    C: reviewedProjects.filter((p) => p.tier === 'C'),
    D: reviewedProjects.filter((p) => p.tier === 'D'),
    E: reviewedProjects.filter((p) => p.tier === 'E'),
    F: reviewedProjects.filter((p) => p.tier === 'F'),
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-8 text-white">
      <h1 className="text-6xl font-black uppercase text-center mb-10 tracking-widest">
        Tier Board
      </h1>

      <div className="max-w-7xl mx-auto flex flex-col border-4 border-black bg-[#111]">
        {tiers.map((tier) => (
          <div key={tier} className="flex border-b-4 border-black min-h-[120px] last:border-b-0">
            {/* Label Column */}
            <div 
              className="w-32 flex-shrink-0 flex items-center justify-center border-r-4 border-black text-black"
              style={{ backgroundColor: tierColors[tier] }}
            >
              <span className="text-5xl font-black">{tier}</span>
            </div>
            
            {/* Projects Content Column */}
            <div className="flex-1 p-4 flex flex-wrap gap-4 content-start bg-[#1a1a1a]">
              {projectsByTier[tier].map((reviewed) => (
                <a
                  key={reviewed.project.id}
                  href={reviewed.project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black border-4 border-black p-3 font-black text-lg hover:bg-gray-200 transition-colors h-20 flex flex-col items-center justify-center min-w-[160px]"
                >
                  <span>{getDomain(reviewed.project.url)}</span>
                  <span className="text-xs font-bold mt-1 text-gray-500">Score: {reviewed.averages.final.toFixed(1)}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto mt-10 flex flex-col border-4 border-black bg-[#111]">
        <div className="flex min-h-[120px]">
          <div className="w-32 flex-shrink-0 flex items-center justify-center border-r-4 border-black bg-gray-500 text-black">
            <span className="text-xl font-black text-center leading-tight">UN-<br/>REVIEWED</span>
          </div>
          <div className="flex-1 p-4 flex flex-wrap gap-4 content-start bg-[#1a1a1a]">
            {unreviewedProjects.map((project) => (
              <a
                key={project.id}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-300 text-black border-4 border-black p-3 font-black text-lg hover:bg-white transition-colors h-20 flex items-center justify-center min-w-[160px]"
              >
                {getDomain(project.url)}
              </a>
            ))}
            
            {unreviewedProjects.length === 0 && (
              <div className="text-gray-500 font-bold italic p-2 flex items-center">
                All projects have been reviewed!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TierBoardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E91E63] flex items-center justify-center"><h1 className="text-4xl font-black text-white">Loading Tier Board...</h1></div>}>
      <TierBoardDisplay />
    </Suspense>
  );
}
