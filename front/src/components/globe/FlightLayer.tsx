import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { ARRIVAL_SCALE, OFF_SCREEN, type Projection } from '@/components/globe/globeConfig';
import { Plane, PLANE_NOSE, PLANE_SIZE } from '@/components/globe/Plane';
import { colors } from '@/constants/theme';
import { fadeOpacity, flightPoint, project, type Vec3 } from '@/lib/geo';

type FlightProps = Projection & {
  /** Progress 0..1 along the arc from `from` to `to`, while `flying`. */
  flightT: SharedValue<number>;
  flying: SharedValue<boolean>;
  /** False for a flight that only turns the globe. */
  withPlane: SharedValue<boolean>;
  from: SharedValue<Vec3>;
  to: SharedValue<Vec3>;
};

type ArrivalProps = Projection & {
  /** Progress 0..1 of the arrival after onboarding, while `arriving`. */
  arrivalT: SharedValue<number>;
  arriving: SharedValue<boolean>;
  arrivalDest: SharedValue<Vec3>;
};

type RippleProps = Projection & {
  /** Progress 0..1 of the touchdown ripple at `arrivalDest`. */
  rippleT: SharedValue<number>;
  arrivalDest: SharedValue<Vec3>;
};

type Props = FlightProps & ArrivalProps & RippleProps;

const RIPPLE_SIZE = 44;

/** Everything that flies over the globe: the plane between pins, the arrival plane and its touchdown ripple. */
export function FlightLayer({ flightT, flying, withPlane, from, to, rippleT, arrivalT, arriving, arrivalDest, ...projection }: Props) {
  return (
    <>
      <FlightPlane {...projection} flightT={flightT} flying={flying} withPlane={withPlane} from={from} to={to} />
      <Ripple {...projection} rippleT={rippleT} arrivalDest={arrivalDest} />
      <ArrivalPlane {...projection} arrivalT={arrivalT} arriving={arriving} arrivalDest={arrivalDest} />
    </>
  );
}

/** The plane on the flight arc, turned along the arc's on-screen direction. */
function FlightPlane({ flightT, flying, withPlane, from, to, yaw, pitch, cx, cy, radius, zoom }: FlightProps) {
  const style = useAnimatedStyle(() => {
    if (!flying.value || !withPlane.value) return { opacity: 0, transform: [{ translateX: OFF_SCREEN }] };
    const t = flightT.value;
    const o = { yaw: yaw.value, pitch: pitch.value };
    const p = project(flightPoint(from.value, to.value, t), o, cx, cy, radius * zoom.value);
    const ahead = project(flightPoint(from.value, to.value, Math.min(1, t + 0.02)), o, cx, cy, radius * zoom.value);
    const heading = Math.atan2(ahead.y - p.y, ahead.x - p.x) - PLANE_NOSE;
    return {
      opacity: fadeOpacity(p.z),
      transform: [
        { translateX: p.x - PLANE_SIZE / 2 },
        { translateY: p.y - PLANE_SIZE / 2 },
        { rotate: `${heading}rad` },
        { scale: 1 + Math.sin(Math.PI * t) * 0.3 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.slot, styles.plane, style]} pointerEvents="none">
      <Plane />
    </Animated.View>
  );
}

/**
 * The arrival plane: it comes in big from beyond the top-left corner, as if from far away, and glides down a curve
 * onto the destination pin, shrinking to its normal size as it lands. The curve's end follows the pin while the
 * globe is still turning, so it touches down exactly on it.
 */
function ArrivalPlane({ arrivalT, arriving, arrivalDest, yaw, pitch, cx, cy, radius, zoom }: ArrivalProps) {
  const style = useAnimatedStyle(() => {
    if (!arriving.value) return { opacity: 0, transform: [{ translateX: OFF_SCREEN }] };
    const t = arrivalT.value;
    // Slow start, then a long glide that settles at the end.
    const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    const end = project(arrivalDest.value, { yaw: yaw.value, pitch: pitch.value }, cx, cy, radius * zoom.value);
    const p0 = { x: -PLANE_SIZE * 2, y: cy - radius - PLANE_SIZE * 2 };
    const p1 = { x: cx - radius * 0.2, y: cy - radius * 1.15 };
    const u = 1 - e;
    const x = u * u * p0.x + 2 * u * e * p1.x + e * e * end.x;
    const y = u * u * p0.y + 2 * u * e * p1.y + e * e * end.y;
    const dx = 2 * u * (p1.x - p0.x) + 2 * e * (end.x - p1.x);
    const dy = 2 * u * (p1.y - p0.y) + 2 * e * (end.y - p1.y);
    const heading = Math.atan2(dy, dx) - PLANE_NOSE;
    return {
      opacity: Math.min(1, t * 6),
      transform: [
        { translateX: x - PLANE_SIZE / 2 },
        { translateY: y - PLANE_SIZE / 2 },
        { rotate: `${heading}rad` },
        { scale: ARRIVAL_SCALE + (1 - ARRIVAL_SCALE) * e },
      ],
    };
  });
  return (
    <Animated.View style={[styles.slot, styles.plane, style]} pointerEvents="none">
      <Plane />
    </Animated.View>
  );
}

/** The touchdown: a ring spreads from the pin's tip and fades. */
function Ripple({ rippleT, arrivalDest, yaw, pitch, cx, cy, radius, zoom }: RippleProps) {
  const style = useAnimatedStyle(() => {
    const t = rippleT.value;
    if (t <= 0 || t >= 1) return { opacity: 0, transform: [{ translateX: OFF_SCREEN }] };
    const p = project(arrivalDest.value, { yaw: yaw.value, pitch: pitch.value }, cx, cy, radius * zoom.value);
    return {
      opacity: (1 - t) * 0.8,
      transform: [{ translateX: p.x - RIPPLE_SIZE / 2 }, { translateY: p.y - RIPPLE_SIZE / 2 }, { scale: 0.3 + t * 2.2 }],
    };
  });
  return <Animated.View style={[styles.slot, styles.ripple, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, top: 0 },
  plane: { zIndex: 250 },
  ripple: {
    zIndex: 240,
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.brandAccent,
  },
});
