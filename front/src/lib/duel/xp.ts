import type { CategoryMatchEnd } from '@/types/duel';

/** XP to climb from level n to n+1 (same curve as the backend's LevelCurve). */
export function levelCost(level: number): number {
  return Math.round(20 + 2 * level ** 1.15);
}

export type BarSpan = {
  /** Share of the level bar already filled before the match (0..1). */
  from: number;
  /** Share filled after the match; 1 when the match crossed a level (the bar fills up first). */
  to: number;
  levelUp: boolean;
};

/** Where a category bar starts and ends for one match. */
export function barSpan(item: CategoryMatchEnd): BarSpan {
  const levelUp = item.levelAfter > item.levelBefore;
  if (levelUp) {
    const cost = levelCost(item.levelBefore);
    const into = Math.max(0, cost - Math.max(0, item.xpGained - item.xpIntoLevelAfter));
    return { from: Math.min(1, into / cost), to: 1, levelUp };
  }
  const forLevel = item.xpForLevelAfter > 0 ? item.xpForLevelAfter : 100;
  return {
    from: clamp((item.xpIntoLevelAfter - item.xpGained) / forLevel),
    to: clamp(item.xpIntoLevelAfter / forLevel),
    levelUp,
  };
}

/** Meta line under a bar: "85 / 100 XP · 15 XP to Lv 4", or "Level up! 12 / 120 XP into Lv 4". */
export function barMeta(item: CategoryMatchEnd): string {
  const forLevel = item.xpForLevelAfter;
  if (item.levelAfter > item.levelBefore) {
    return `Level up! ${item.xpIntoLevelAfter} / ${forLevel} XP into Lv ${item.levelAfter}`;
  }
  return `${item.xpIntoLevelAfter} / ${forLevel} XP · ${Math.max(0, forLevel - item.xpIntoLevelAfter)} XP to Lv ${item.levelAfter + 1}`;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
