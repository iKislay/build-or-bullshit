'use client';

import { useState } from 'react';
import { getSocket } from '@/lib/socket';
import { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProjectEditorProps {
  roomCode: string;
  projects: Project[];
  onStart: () => void;
}

export default function ProjectEditor({ roomCode, projects, onStart }: ProjectEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Project>>({});

  const socket = getSocket();

  const beginEdit = (project: Project) => {
    setExpandedId(project.id);
    setDraft(project);
  };

  const cancelEdit = () => {
    setExpandedId(null);
    setDraft({});
  };

  const saveEdit = () => {
    if (!expandedId) return;
    const { id, ...updates } = draft;
    socket.emit('edit-project', { roomCode, projectId: expandedId, updates });
    cancelEdit();
  };

  const approveProject = (projectId: string) => {
    socket.emit('approve-project', { roomCode, projectId });
  };

  const deleteProject = (projectId: string, url: string) => {
    if (!confirm(`Delete project "${url || projectId}"?`)) return;
    socket.emit('delete-project', { roomCode, projectId });
  };

  const approvedProjects = projects.filter(p => p.isApproved !== false);
  const pendingDuplicates = projects.filter(p => p.isDuplicate && p.isApproved === false);

  return (
    <div className="neo-card bg-[#FFEB3B] max-w-4xl mx-auto">
      <h2 className="text-4xl font-black uppercase mb-2 text-center">
        Review Projects
      </h2>
      <p className="text-lg font-bold text-center mb-6">
        Edit any project details, then start the review.
      </p>

      {pendingDuplicates.length > 0 && (
        <div className="border-4 border-black bg-[#F44336] p-4 mb-6 text-white text-center font-black uppercase">
          {pendingDuplicates.length} Duplicate {pendingDuplicates.length === 1 ? 'project' : 'projects'} found! They won't be added to the review unless you click "Add".
        </div>
      )}

      <div className="space-y-3 mb-6">
        {projects.map((project, idx) => {
          const isExpanded = expandedId === project.id;
          const isUnapprovedDuplicate = project.isDuplicate && project.isApproved === false;

          return (
            <div key={project.id} className={`border-4 border-black ${isUnapprovedDuplicate ? 'bg-[#FFCDD2]' : 'bg-white'}`}>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-500">#{idx + 1}</p>
                    {project.isDuplicate && (
                      <span className="bg-[#F44336] text-white text-[10px] font-black px-2 py-0.5 uppercase border-2 border-black">
                        Duplicate
                      </span>
                    )}
                  </div>
                  <p className="font-black text-lg truncate">{project.url || '(no URL)'}</p>
                  <p className="text-sm font-bold text-gray-700 truncate">{project.description || '(no description)'}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isUnapprovedDuplicate && (
                    <Button
                      onClick={() => approveProject(project.id)}
                      className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] text-white text-sm px-3 py-2"
                    >
                      Add
                    </Button>
                  )}
                  {!isExpanded && (
                    <Button
                      onClick={() => beginEdit(project)}
                      className="neo-button bg-[#00BCD4] hover:bg-[#00BCD4] text-sm px-3 py-2"
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteProject(project.id, project.url)}
                    className="neo-button bg-[#F44336] hover:bg-[#F44336] text-white text-sm px-3 py-2"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t-4 border-black p-4 space-y-3 bg-[#FFF9C4]">
                  <div>
                    <Label className="font-black uppercase text-sm">URL</Label>
                    <Input
                      value={draft.url ?? ''}
                      onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                      className="neo-input w-full"
                    />
                  </div>
                  <div>
                    <Label className="font-black uppercase text-sm">Description</Label>
                    <textarea
                      value={draft.description ?? ''}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      className="w-full border-4 border-black p-2 font-bold min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label className="font-black uppercase text-sm">Stage</Label>
                    <Input
                      value={draft.stage ?? ''}
                      onChange={(e) => setDraft({ ...draft, stage: e.target.value })}
                      className="neo-input w-full"
                    />
                  </div>
                  <div>
                    <Label className="font-black uppercase text-sm">Launched on forg.to?</Label>
                    <Input
                      value={draft.launched ?? ''}
                      onChange={(e) => setDraft({ ...draft, launched: e.target.value })}
                      className="neo-input w-full"
                    />
                  </div>
                  <div>
                    <Label className="font-black uppercase text-sm">Struggling with</Label>
                    <textarea
                      value={draft.struggling ?? ''}
                      onChange={(e) => setDraft({ ...draft, struggling: e.target.value })}
                      className="w-full border-4 border-black p-2 font-bold min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label className="font-black uppercase text-sm">Credentials</Label>
                    <Input
                      value={draft.credentials ?? ''}
                      onChange={(e) => setDraft({ ...draft, credentials: e.target.value })}
                      className="neo-input w-full"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={saveEdit}
                      className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] flex-1"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      className="neo-button bg-black hover:bg-black text-white flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        onClick={onStart}
        disabled={approvedProjects.length === 0}
        className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full text-2xl py-6 disabled:opacity-50"
      >
        Start Review ({approvedProjects.length} {approvedProjects.length === 1 ? 'project' : 'projects'})
      </Button>
    </div>
  );
}
