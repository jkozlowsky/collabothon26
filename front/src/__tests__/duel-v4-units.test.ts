import { summarizeMatches } from '@/lib/duel/history';
import { STICKY_PAD, stickyPosition } from '@/lib/duel/sticky';
import type { MatchSummary } from '@/types/duel';

const m = (mode: MatchSummary['mode'], outcome: MatchSummary['outcome']) => ({ mode, outcome }) as MatchSummary;

test('summarizeMatches counts W / L / D and skips solo', () => {
  expect(summarizeMatches([m('HUMAN', 'WIN'), m('HUMAN', 'WIN'), m('HUMAN', 'LOSS'), m('HUMAN', 'DRAW'), m('SOLO', 'SOLO')])).toEqual({ wins: 2, losses: 1, draws: 1 });
});

describe('stickyPosition', () => {
  const H = 600;
  const h = 64;
  test('inline while the row is in view', () => {
    expect(stickyPosition(300, h, 0, H)).toBeNull();
    expect(stickyPosition(300, h, 250, H)).toBeNull();
  });
  test('pinned to the bottom while not reached yet', () => {
    expect(stickyPosition(900, h, 0, H)).toBe('bottom');
  });
  test('pinned to the top once scrolled past', () => {
    expect(stickyPosition(300, h, 600, H)).toBe('top');
  });
  test('hand-off happens at the pinned row position, so there is no jump', () => {
    // Top: inline row at y = PAD swaps with the pinned copy, which also draws at PAD.
    expect(stickyPosition(300, h, 300 - STICKY_PAD, H)).toBeNull();
    expect(stickyPosition(300, h, 300 - STICKY_PAD + 1, H)).toBe('top');
    // Bottom: inline row bottom at viewport - PAD swaps with the pinned copy.
    expect(stickyPosition(H - STICKY_PAD - h, h, 0, H)).toBeNull();
    expect(stickyPosition(H - STICKY_PAD - h + 1, h, 0, H)).toBe('bottom');
  });
});
