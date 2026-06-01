'use client';

import { Project, Stage } from '@/lib/types';

interface ProjectDisplayProps {
  project: Project;
  stage: Stage;
  isHost?: boolean;
}

export default function ProjectDisplay({ project, stage, isHost = false }: ProjectDisplayProps) {
  const showURL = stage !== 'guess';
  const showDescription = stage !== 'guess' && stage !== 'reveal';
  const showFullDetails = stage === 'product-review' || stage === 'stage-guess' || stage === 'completed';

  return (
    <div className="neo-card bg-[#00BCD4]">
      <h3 className="text-4xl font-black uppercase mb-6 text-center">
        Current Project
      </h3>

      <div className="space-y-4">
        {stage === 'guess' && (
          <div className="border-4 border-black bg-white p-8 text-center">
            <p className="text-xl font-black uppercase mb-4 text-[#E91E63]">
              Guess What It Does!
            </p>
            <p className="text-lg font-black uppercase mb-2 text-left">URL:</p>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-4xl font-black break-all hover:underline"
            >
              {project.url || 'No URL provided'}
            </a>
          </div>
        )}

        {stage === 'reveal' && (
          <div className="space-y-4">
            <div className="border-4 border-black bg-white p-6">
              <p className="text-lg font-black uppercase mb-2">URL:</p>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl font-bold break-all hover:underline"
              >
                {project.url || 'No URL provided'}
              </a>
            </div>

            <div className="border-4 border-black bg-[#FFEB3B] p-6">
              <p className="text-lg font-black uppercase mb-2">Description:</p>
              <p className="text-2xl font-bold">{project.description}</p>
            </div>
          </div>
        )}

        {showURL && stage !== 'reveal' && (
          <div className="border-4 border-black bg-white p-6">
            <p className="text-lg font-black uppercase mb-2">URL:</p>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-bold break-all hover:underline"
            >
              {project.url || 'No URL provided'}
            </a>
          </div>
        )}

        {showFullDetails && (
          <>
            <div className="border-4 border-black bg-white p-6">
              <p className="text-lg font-black uppercase mb-2">Description:</p>
              <p className="text-xl font-bold">{project.description}</p>
            </div>

            {project.credentials && (
              <div className="border-4 border-black bg-[#4CAF50] p-6">
                <p className="text-lg font-black uppercase mb-2">Credentials:</p>
                <p className="text-lg font-bold">{project.credentials}</p>
              </div>
            )}

            {project.struggling && (
              <div className="border-4 border-black bg-[#FF9800] p-6">
                <p className="text-lg font-black uppercase mb-2">Struggling With:</p>
                <p className="text-lg font-bold">{project.struggling}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
