/**
 * Scene canvas geometry (lesson-video-mode-spec §3.2): every scene is drawn on 390 × 312 and scaled to fill
 * the player ("slice"). Kit elements place themselves on these lines.
 */
export const CANVAS = {
  width: 390,
  height: 312,
  /** Floor line: characters stand on it. */
  floor: 256,
  /** Desk top for indoor places: seated characters sit behind it. */
  desk: 226,
  /** The indoor window, where the skyline and the landmark show. */
  window: { x: 36, y: 40, width: 318, height: 140 },
} as const;

/** Duration of a pop-in (tags, bubbles) and of the amount's fade, in seconds. */
export const POP = 0.25;
