import {
  angleBetween,
  flightDuration,
  latLngToVector,
  MAX_PITCH,
  orientationFacing,
  project,
  slerp,
  vectorToLatLng,
  visibility,
  type Vec3,
} from '@/lib/geo';

const BERLIN = latLngToVector({ lat: 52.52, lng: 13.4 });
const SEOUL = latLngToVector({ lat: 37.57, lng: 126.98 });

const close = (a: Vec3, b: Vec3) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

test('latLngToVector puts (0, 0) facing the camera and the poles on the y axis', () => {
  close(latLngToVector({ lat: 0, lng: 0 }), [0, 0, 1]);
  close(latLngToVector({ lat: 90, lng: 0 }), [0, 1, 0]);
  close(latLngToVector({ lat: -90, lng: 0 }), [0, -1, 0]);
  close(latLngToVector({ lat: 0, lng: 90 }), [1, 0, 0]);
});

test('vectorToLatLng inverts latLngToVector', () => {
  const back = vectorToLatLng(SEOUL);
  expect(back.lat).toBeCloseTo(37.57, 6);
  expect(back.lng).toBeCloseTo(126.98, 6);
});

test('the middle of the Berlin → Seoul arc lies on their great circle', () => {
  const mid = slerp(BERLIN, SEOUL, 0.5);
  expect(Math.hypot(...mid)).toBeCloseTo(1, 6);
  // On the plane through the centre, Berlin and Seoul…
  expect(dot(mid, cross(BERLIN, SEOUL))).toBeCloseTo(0, 6);
  // …and halfway along it.
  expect(angleBetween(BERLIN, mid)).toBeCloseTo(angleBetween(mid, SEOUL), 6);
});

test('a pin on the far side of the globe has visibility < 0', () => {
  const facing = orientationFacing(BERLIN);
  expect(visibility(BERLIN, facing.yaw, facing.pitch)).toBeGreaterThan(0.9);
  const antipode: Vec3 = [-BERLIN[0], -BERLIN[1], -BERLIN[2]];
  expect(visibility(antipode, facing.yaw, facing.pitch)).toBeLessThan(0);
});

test('orientationFacing centres a point and clamps the tilt', () => {
  const seoul = orientationFacing(SEOUL);
  const p = project(SEOUL, seoul, 100, 100, 50);
  expect(p.x).toBeCloseTo(100, 6);
  expect(p.y).toBeCloseTo(100, 6);

  const pole = orientationFacing(latLngToVector({ lat: 89, lng: 0 }));
  expect(pole.pitch).toBeCloseTo(MAX_PITCH, 6);
});

test('orientationFacing turns the short way round', () => {
  // From yaw just under +180°, a point at lng 170° is 20° away, not 340°.
  const o = orientationFacing(latLngToVector({ lat: 0, lng: 170 }), Math.PI - 0.1);
  expect(Math.abs(o.yaw - (Math.PI - 0.1))).toBeLessThan(0.5);
});

test('flights take 0.8 to 1.8 s by distance', () => {
  expect(flightDuration(BERLIN, BERLIN)).toBe(800);
  expect(flightDuration(BERLIN, SEOUL)).toBeGreaterThan(800);
  expect(flightDuration(BERLIN, [-BERLIN[0], -BERLIN[1], -BERLIN[2]])).toBe(1800);
});
