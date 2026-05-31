'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { ReviewedProject, Project } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function TierBoardDisplay() {
  const [reviewedProjects, setReviewedProjects] = useState<ReviewedProject[]>([]);
  const [unreviewedProjects, setUnreviewedProjects] = useState<Project[]>([]);

  useEffect(() => {
    const socket = getSocket();

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
  }, []);

  const tierColors = {
    S: '#FFEB3B',
    A: '#4CAF50',
    B: '#00BCD4',
    C: '#FF9800',
    D: '#E91E63',
    F: '#F44336',
  };

  const projectsByTier = {
    S: reviewedProjects.filter((p) => p.tier === 'S'),
    A: reviewedProjects.filter((p) => p.tier === 'A'),
    B: reviewedProjects.filter((p) => p.tier === 'B'),
    C: reviewedProjects.filter((p) => p.tier === 'C'),
    D: reviewedProjects.filter((p) => p.tier === 'D'),
    F: reviewedProjects.filter((p) => p.tier === 'F'),
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="neo-card bg-[#E91E63] mb-6">
        <h1 className="text-7xl font-black uppercase text-center">
          Tier Board
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(['S', 'A', 'B', 'C', 'D', 'F'] as const).map((tier) => (
          <div key={tier} className="neo-card" style={{ backgroundColor: tierColors[tier] }}>
            <div className="text-center mb-4">
              <Badge className="text-5xl font-black px-6 py-3 bg-black text-white border-0">
                {tier} TIER
              </Badge>
              <p className="text-2xl font-black mt-2">
                {projectsByTier[tier].length} {projectsByTier[tier].length === 1 ? 'Project' : 'Projects'}
              </p>
            </div>

            <div className="space-y-3">
              {projectsByTier[tier].map((reviewed) => (
                <div
                  key={reviewed.project.id}
                  className="border-4 border-black bg-white p-4"
                >
                  <a
                    href={reviewed.project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-black text-lg hover:underline block mb-2"
                  >
                    {new URL(reviewed.project.url).hostname.replace('www.', '')}
                  </a>
                  <p className="font-bold text-sm mb-2 line-clamp-2">
                    {reviewed.project.description}
                  </p>
                  <div className="border-t-2 border-black pt-2 mt-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span>Final Score:</span>
                      <span className="font-black">{reviewed.averages.final.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {projectsByTier[tier].length === 0 && (
                <div className="border-4 border-black bg-white p-6 text-center">
                  <p className="font-bold text-gray-400">No projects yet</p>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="neo-card bg-[#9C27B0] md:col-span-2 lg:col-span-4">
          <div className="text-center mb-4">
            <Badge className="text-4xl font-black px-6 py-3 bg-black text-white border-0">
              UNREVIEWED
            </Badge>
            <p className="text-2xl font-black mt-2">
              {unreviewedProjects.length} {unreviewedProjects.length === 1 ? 'Project' : 'Projects'} Remaining
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {unreviewedProjects.map((project) => (
              <div
                key={project.id}
                className="border-4 border-black bg-white p-4"
              >
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-black text-base hover:underline block"
                >
                  {new URL(project.url).hostname.replace('www.', '')}
                </a>
              </div>
            ))}

            {unreviewedProjects.length === 0 && (
              <div className="border-4 border-black bg-white p-6 text-center col-span-full">
                <p className="font-bold text-gray-400">All projects reviewed!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
