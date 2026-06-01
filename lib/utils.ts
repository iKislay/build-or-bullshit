import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

export function calculateTier(finalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (finalScore >= 9) return 'S';
  if (finalScore >= 8) return 'A';
  if (finalScore >= 7) return 'B';
  if (finalScore >= 6) return 'C';
  if (finalScore >= 5) return 'D';
  return 'F';
}

export function normalizeStage(stage: string | undefined | null): string {
  if (!stage) return '';
  return stage.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function calculateFinalScore(averages: {
  firstImpression: number;
  design: number;
  clarity: number;
  value: number;
  potential: number;
}): number {
  const sum =
    averages.firstImpression +
    averages.design +
    averages.clarity +
    averages.value +
    averages.potential;
  return Math.round((sum / 5) * 100) / 100;
}
