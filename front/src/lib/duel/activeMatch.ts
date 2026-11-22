import type { LocalDot } from '@/lib/duel/reducer';
import type { DuelMode } from '@/types/duel';

/** The match in progress, kept in sessionStorage so a web reload resumes it (native has no sessionStorage). */
type StoredActiveMatch = {
  matchId: number;
  categories: string[];
  mode: DuelMode;
  yourDots: LocalDot[];
};

function storageKey(userId: string): string {
  return `fq_duel_active_match:${userId}`;
}

export function readStoredMatch(categories: string[], mode: DuelMode, userId: string): StoredActiveMatch | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredActiveMatch>;
    if (
      typeof parsed.matchId === 'number' &&
      Number.isFinite(parsed.matchId) &&
      parsed.mode === mode
    ) {
      return {
        matchId: parsed.matchId,
        categories: Array.isArray(parsed.categories) ? parsed.categories : categories,
        mode: parsed.mode,
        yourDots: Array.isArray(parsed.yourDots) ? (parsed.yourDots as LocalDot[]) : [],
      };
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function writeStoredMatch(data: StoredActiveMatch, userId: string): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredActiveMatch(userId: string = 'demo-user'): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.removeItem(storageKey(userId));
  } catch {
    // Ignore storage errors
  }
}
