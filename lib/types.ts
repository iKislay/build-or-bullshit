export type Role = 'host' | 'panelist';

export type Stage =
  | 'guess'
  | 'reveal'
  | 'open'
  | 'first-impression'
  | 'landing-review'
  | 'product-review'
  | 'stage-guess'
  | 'struggle-guess'
  | 'completed';

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Project {
  id: string;
  submissionId: string;
  submittedAt: string;
  url: string;
  description: string;
  stage: string;
  launched: string;
  struggling: string;
  credentials: string;
  isDuplicate?: boolean;
  isApproved?: boolean;
}

export interface Panelist {
  panelistId: string;
  name: string;
  socketId: string;
  score: number;
}

export interface Vote {
  panelistId: string;
  value: number | string;
  category?: string;
}

export interface CategoryVotes {
  design: Map<string, number>;
  clarity: Map<string, number>;
  value: Map<string, number>;
}

export interface ReviewedProject {
  project: Project;
  votes: {
    firstImpression: number[];
    design: number[];
    clarity: number[];
    value: number[];
    potential: number[];
  };
  averages: {
    firstImpression: number;
    design: number;
    clarity: number;
    value: number;
    potential: number;
    final: number;
  };
  tier: Tier;
  stageGuesses: Record<string, string>;
  correctGuesses: string[];
}

export interface Room {
  code: string;
  name: string;
  host: string;
  hostSocketId: string;
  panelists: Panelist[];
  projects: Project[];
  currentProjectIndex: number;
  currentStage: Stage;
  votes: {
    firstImpression: Map<string, number>;
    design: Map<string, number>;
    clarity: Map<string, number>;
    value: Map<string, number>;
    potential: Map<string, number>;
    stageGuess: Map<string, string>;
    struggleGuess: Map<string, string>;
  };
  revealed: {
    firstImpression: boolean;
    design: boolean;
    clarity: boolean;
    value: boolean;
    potential: boolean;
    stageGuess: boolean;
    struggleGuess: boolean;
  };
  reviewedProjects: ReviewedProject[];
  forceReveal?: boolean;
}

export interface Session {
  role: Role;
  name: string;
  sessionId: string;
}

export interface CSVRow {
  "Submission ID": string;
  "Submitted At": string;
  "Your project link": string;
  "What does your project do? (In short)": string;
  "At what stage your product is?": string;
  "Have you launched on forg.to?": string;
  "One thing you're struggling with": string;
  "Dummy credentials": string;
}
