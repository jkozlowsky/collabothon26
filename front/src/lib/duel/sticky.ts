export type StickyPosition = 'top' | 'bottom' | null;

/** Padding of the pinned strip around the row (StickyRankRow: spacing.md). */
export const STICKY_PAD = 12;

/**
 * Where your pinned row sits, from the measured row y (in scroll content) and the scroll offset.
 * The inline row and the pinned copy swap at the same y: the pinned row occupies [PAD, PAD + h] at the top
 * and [viewport - PAD - h, viewport - PAD] at the bottom, so nothing jumps at the hand-off.
 */
export function stickyPosition(rowTop: number, rowHeight: number, scrollY: number, viewportHeight: number, pad = STICKY_PAD): StickyPosition {
  const top = rowTop - scrollY;
  if (top < pad) return 'top';
  if (top + rowHeight > viewportHeight - pad) return 'bottom';
  return null;
}
