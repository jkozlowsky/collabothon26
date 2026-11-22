/**
 * Tuning of the Map tab's globe: layout shares, gesture feel, flight, arrival and idle-spin timings.
 * The numbers are read on the UI thread too, so they stay plain module constants.
 */
import { Easing, type SharedValue } from 'react-native-reanimated';

/** What an overlay needs to place a point of the sphere on screen: the orientation, the centre, the radius and the zoom. */
export type Projection = {
  yaw: SharedValue<number>;
  pitch: SharedValue<number>;
  cx: number;
  cy: number;
  radius: number;
  zoom: SharedValue<number>;
};

/** Globe area width : height (390 × 330 in frame 3:496, made taller for a bigger globe). */
export const ASPECT = 390 / 350;
/** Sphere radius as a share of the smaller side of the globe area (315 px across on a 390 × 350 area). */
export const RADIUS_SHARE = 0.45;
/** The canvas reaches this many area heights below the area (under the hint and the sheet). */
export const CANVAS_BELOW = 1.5;
/** A hidden overlay is also moved this far left, so it cannot be tapped. */
export const OFF_SCREEN = -10000;
/** Fade-in of the globe once its first frame is drawn. */
export const REVEAL_MS = 300;

/** Inertia: about 0.95 of the speed is kept per frame at 60 fps. */
export const DECELERATION = 0.997;
/** Pinch zoom range: 1 is the whole globe in view. */
export const MAX_ZOOM = 3;
/** Mouse wheel on web: zoom factor per pixel of scroll. */
export const WHEEL_ZOOM = 0.002;

export function clampZoom(z: number) {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(1, z));
}

/** During a flight the view catches up with the plane over this first share of the flight. */
export const CATCH_UP = 0.35;
export const FLIGHT_EASING = Easing.inOut(Easing.cubic);

/** The arrival: the globe starts this many degrees of longitude west of the destination and spins in under the plane. */
export const ARRIVAL_SPAN_DEG = 110;
export const ARRIVAL_MS = 2800;
/** Pause between the globe appearing and the take-off, so the user sees where the plane starts. */
export const ARRIVAL_DELAY_MS = 500;
/** The globe's spin ends a little before the plane touches down, so the pin is still when it lands. */
export const ARRIVAL_SPIN_SHARE = 0.85;
/** The plane comes from far away: this big at the start, normal size on touchdown. */
export const ARRIVAL_SCALE = 2.6;
export const RIPPLE_MS = 900;

export function easeOutCubic(w: number) {
  'worklet';
  return 1 - (1 - w) ** 3;
}

/** Idle spin: starts this long after the last touch while no callout is open. */
export const IDLE_MS = 3000;
/** Idle spin speed: one turn a minute, eased in over IDLE_RAMP_MS. */
export const IDLE_SPEED = (2 * Math.PI) / 60000;
export const IDLE_RAMP_MS = 1500;
