import type { MatchSummary } from '@/types/duel';

/** W / L / D count over finished matches; solo practice has no winner and is left out. */
export function summarizeMatches(finished: MatchSummary[]): { wins: number; losses: number; draws: number } {
  const record = { wins: 0, losses: 0, draws: 0 };
  for (const m of finished) {
    if (m.mode === 'SOLO') continue;
    if (m.outcome === 'WIN') record.wins += 1;
    else if (m.outcome === 'LOSS') record.losses += 1;
    else if (m.outcome === 'DRAW') record.draws += 1;
  }
  return record;
}
