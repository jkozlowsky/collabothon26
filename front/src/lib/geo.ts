/**
 * Globe maths, shared by the three.js scene, the RN pin overlay (Reanimated worklets) and the fallback picture.
 *
 * World space: unit sphere, y = north pole, (lat 0, lng 0) at +z (facing the camera when the globe is unturned),
 * east = +x. The globe is turned by `yaw` about y, then `pitch` about x (three.js Euler 'XYZ'), and viewed by an
 * orthographic camera looking down -z, so a turned point's x/y are its screen offset and z is its "facing" value.
 */
export type Vec3 = [number, number, number];
export type LatLng = { lat: number; lng: number };
export type Orientation = { yaw: number; pitch: number };

/** Vertical tilt limit (spec: ±50°). */
export const MAX_PITCH = (50 * Math.PI) / 180;
/** Pins fade out over this band of `visibility` before they disappear behind the sphere. */
export const FADE_BAND = 0.2;
/** Flight height above the surface at mid-arc, in sphere radii. */
export const FLIGHT_ALTITUDE = 0.15;
/** Centre of the static fallback picture; keep in sync with scripts/make-globe-texture.mjs. */
export const FALLBACK_CENTER: LatLng = { lat: 30, lng: 15 };

export function toRad(deg: number) {
  'worklet';
  return (deg * Math.PI) / 180;
}

export function latLngToVector({ lat, lng }: LatLng): Vec3 {
  'worklet';
  const la = toRad(lat);
  const lo = toRad(lng);
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

export function vectorToLatLng(v: Vec3): LatLng {
  'worklet';
  const len = Math.hypot(v[0], v[1], v[2]);
  return {
    lat: (Math.asin(Math.max(-1, Math.min(1, v[1] / len))) * 180) / Math.PI,
    lng: (Math.atan2(v[0], v[2]) * 180) / Math.PI,
  };
}

/** World → view: yaw about y, then pitch about x. */
export function rotate(v: Vec3, yaw: number, pitch: number): Vec3 {
  'worklet';
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x = v[0] * cy + v[2] * sy;
  const z = -v[0] * sy + v[2] * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [x, v[1] * cp - z * sp, v[1] * sp + z * cp];
}

/** Dot product of a surface point's normal with the direction to the camera: < 0 means behind the sphere. */
export function visibility(v: Vec3, yaw: number, pitch: number) {
  'worklet';
  return rotate(v, yaw, pitch)[2];
}

/** Pin opacity from its visibility: hidden behind the sphere, fading in near the horizon. */
export function fadeOpacity(vis: number) {
  'worklet';
  return Math.max(0, Math.min(1, vis / FADE_BAND));
}

/** Screen position (px) of a world point for a globe of `radius` px centred at (cx, cy). */
export function project(v: Vec3, o: Orientation, cx: number, cy: number, radius: number) {
  'worklet';
  const r = rotate(v, o.yaw, o.pitch);
  return { x: cx + r[0] * radius, y: cy - r[1] * radius, z: r[2] };
}

export function angleBetween(a: Vec3, b: Vec3) {
  'worklet';
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

/** Spherical interpolation between unit vectors: the great-circle path from a (t = 0) to b (t = 1). */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  'worklet';
  const omega = angleBetween(a, b);
  if (omega < 1e-6) return [a[0], a[1], a[2]];
  const s = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / s;
  const wb = Math.sin(t * omega) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}

/** Plane position on the flight arc: the great circle lifted by `FLIGHT_ALTITUDE · sin(πt)`. */
export function flightPoint(a: Vec3, b: Vec3, t: number): Vec3 {
  'worklet';
  const p = slerp(a, b, t);
  const h = 1 + FLIGHT_ALTITUDE * Math.sin(Math.PI * t);
  return [p[0] * h, p[1] * h, p[2] * h];
}

/** 0.8 s for a hop, up to 1.8 s for half the world. */
export function flightDuration(a: Vec3, b: Vec3) {
  return Math.round(800 + Math.min(1, angleBetween(a, b) / Math.PI) * 1000);
}

/** Wraps an angle into [-π, π]. */
export function wrapAngle(a: number) {
  'worklet';
  return a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
}

export function clampPitch(p: number) {
  'worklet';
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p));
}

/**
 * The orientation that puts `v` in the middle of the view (pitch clamped), with yaw chosen nearest to
 * `fromYaw` so the globe never spins the long way round.
 */
export function orientationFacing(v: Vec3, fromYaw = 0): Orientation {
  'worklet';
  const { lat, lng } = vectorToLatLng(v);
  const yaw = -toRad(lng);
  return { yaw: fromYaw + wrapAngle(yaw - fromYaw), pitch: clampPitch(toRad(lat)) };
}

/** Centre of the view as a point on the sphere (inverse of orientationFacing). */
export function viewCentre(yaw: number, pitch: number): Vec3 {
  'worklet';
  return latLngToVector({ lat: (pitch * 180) / Math.PI, lng: (-yaw * 180) / Math.PI });
}
