import { create } from 'zustand';
import { Session, Room, Project, Panelist } from './types';

interface AuthStore {
  session: Session | null;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => {
    sessionStorage.removeItem('session');
    set({ session: null });
  },
}));

interface RoomStore {
  room: Room | null;
  setRoom: (room: Room | null) => void;
  updateRoom: (updates: Partial<Room>) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
  updateRoom: (updates) =>
    set((state) => ({
      room: state.room ? { ...state.room, ...updates } : null,
    })),
}));

interface ProjectStore {
  currentProject: Project | null;
  currentStage: Room['currentStage'];
  setCurrentProject: (project: Project | null) => void;
  setCurrentStage: (stage: Room['currentStage']) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,
  currentStage: 'guess',
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentStage: (stage) => set({ currentStage: stage }),
}));

interface VoteStore {
  votes: {
    firstImpression: Map<string, number>;
    design: Map<string, number>;
    clarity: Map<string, number>;
    value: Map<string, number>;
    potential: Map<string, number>;
    stageGuess: Map<string, string>;
  };
  revealed: {
    firstImpression: boolean;
    design: boolean;
    clarity: boolean;
    value: boolean;
    potential: boolean;
    stageGuess: boolean;
  };
  setVotes: (category: string, votes: Map<string, number | string>) => void;
  setRevealed: (category: string, revealed: boolean) => void;
  clearVotes: () => void;
}

export const useVoteStore = create<VoteStore>((set) => ({
  votes: {
    firstImpression: new Map(),
    design: new Map(),
    clarity: new Map(),
    value: new Map(),
    potential: new Map(),
    stageGuess: new Map(),
  },
  revealed: {
    firstImpression: false,
    design: false,
    clarity: false,
    value: false,
    potential: false,
    stageGuess: false,
  },
  setVotes: (category, votes) =>
    set((state) => ({
      votes: { ...state.votes, [category]: votes },
    })),
  setRevealed: (category, revealed) =>
    set((state) => ({
      revealed: { ...state.revealed, [category]: revealed },
    })),
  clearVotes: () =>
    set({
      votes: {
        firstImpression: new Map(),
        design: new Map(),
        clarity: new Map(),
        value: new Map(),
        potential: new Map(),
        stageGuess: new Map(),
      },
      revealed: {
        firstImpression: false,
        design: false,
        clarity: false,
        value: false,
        potential: false,
        stageGuess: false,
      },
    }),
}));

interface ScoreStore {
  panelists: Panelist[];
  setPanelists: (panelists: Panelist[]) => void;
  updatePanelistScore: (panelistId: string, score: number) => void;
}

export const useScoreStore = create<ScoreStore>((set) => ({
  panelists: [],
  setPanelists: (panelists) => set({ panelists }),
  updatePanelistScore: (panelistId, score) =>
    set((state) => ({
      panelists: state.panelists.map((p) =>
        p.id === panelistId ? { ...p, score } : p
      ),
    })),
}));
