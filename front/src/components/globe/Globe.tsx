import { useIsFocused } from 'expo-router';
import { Component, lazy, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useState, type ReactNode, type Ref } from 'react';
import { Image, Platform, Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { ArenaCallout } from '@/components/globe/ArenaCallout';
import { ArenaPin } from '@/components/globe/ArenaPin';
import { GlobePin, PIN_BOX } from '@/components/globe/GlobePin';
import { CALLOUT_WIDTH, PinCallout } from '@/components/globe/PinCallout';
import { Plane, PLANE_NOSE, PLANE_SIZE } from '@/components/globe/Plane';
import { colors } from '@/constants/theme';
import {
  clampPitch,
  FADE_BAND,
  FALLBACK_CENTER,
  fadeOpacity,
  flightDuration,
  flightPoint,
  latLngToVector,
  MAX_PITCH,
  orientationFacing,
  project,
  slerp,
  toRad,
  visibility,
  type Vec3,
} from '@/lib/geo';
import { calloutState, storyState } from '@/lib/stories';
import type { Story } from '@/types/stories';

// Loaded on first use: keeps three.js out of every other screen's bundle and out of the jest route tree.
const GlobeScene = lazy(() => import('@/components/globe/GlobeScene').then((m) => ({ default: m.GlobeScene })));

export type GlobeHandle = {
  /** Same as tapping the story's pin: fly there and open its callout. `turnOnly`: never open the story itself (static picture). */
  flyTo: (id: string, turnOnly?: boolean) => void;
  /** Face the story's pin at once, with no flight and no callout; a later `flyTo` takes off from there. */
  face: (id: string) => void;
  /** The arrival after onboarding: once the globe is drawn, the plane swoops in from off-screen and lands on the story's pin. */
  flyIn: (id: string) => void;
};

export type ArenaConfig = {
  pin?: { lat: number; lng: number };
  onOpen: () => void;
};

type Props = {
  stories: Story[];
  /** The callout's button: open the story screen. */
  onOpenStory: (id: string) => void;
  /** The user started turning the globe. */
  onSpin?: () => void;
  /** Extra pin for the duel arena (Lisbon by default, clear of the Berlin pin). */
  arena?: ArenaConfig;
  /** The story the Quick check picked, with its "Why here" line; its callout carries the badge. */
  startHere?: { storyId: string; why: string } | null;
  /** The story whose path was finished just now: its pin's check pops in. */
  justDoneId?: string;
  ref?: Ref<GlobeHandle>;
};

/** Globe area width : height (390 × 330 in frame 3:496). */
const ASPECT = 390 / 330;
/** Sphere radius as a share of the smaller side of the globe area (280 px on a 390 × 330 area). */
const RADIUS_SHARE = 0.42;
/** Inertia: about 0.95 of the speed is kept per frame at 60 fps. */
const DECELERATION = 0.997;
/** During a flight the view catches up with the plane over this first share of the flight. */
const CATCH_UP = 0.35;
const EDGE = 8;
const FLIGHT_EASING = Easing.inOut(Easing.cubic);
const easeOutCubic = (w: number) => {
  'worklet';
  return 1 - (1 - w) ** 3;
};
/** Default arena pin: Lisbon. Rome sat right under the Berlin pin. */
const ARENA_PIN = { lat: 38.72, lng: -9.14 };
/** The arrival: the globe starts this many degrees of longitude west of the destination and spins in under the plane. */
const ARRIVAL_SPAN_DEG = 110;
const ARRIVAL_MS = 2800;
/** The globe's spin ends a little before the plane touches down, so the pin is still when it lands. */
const ARRIVAL_SPIN_SHARE = 0.85;
/** The plane comes from far away: this big at the start, normal size on touchdown. */
const ARRIVAL_SCALE = 2.6;
const RIPPLE_MS = 900;
const RIPPLE_SIZE = 44;
/** Pause between the globe appearing and the take-off, so the user sees where the plane starts. */
const ARRIVAL_DELAY_MS = 500;
/** Set EXPO_PUBLIC_GLOBE_FALLBACK=1 to force the static globe (to check the fallback). */
const FORCE_FALLBACK = process.env.EXPO_PUBLIC_GLOBE_FALLBACK === '1';
const FALLBACK_IMAGE = require('../../../assets/globe/globe-fallback.png');
const FALLBACK_ORIENTATION = { yaw: -toRad(FALLBACK_CENTER.lng), pitch: toRad(FALLBACK_CENTER.lat) };

function webGLAvailable() {
  if (Platform.OS !== 'web') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Centre of the view as a point on the sphere (inverse of orientationFacing). */
function viewCentre(yaw: number, pitch: number): Vec3 {
  'worklet';
  return latLngToVector({ lat: (pitch * 180) / Math.PI, lng: (-yaw * 180) / Math.PI });
}

/**
 * The 3D globe of the Map tab: a three.js sphere with RN pins, plane and callout laid over it.
 * Orientation lives in Reanimated shared values, so dragging, inertia, flights and the overlay all run
 * on the UI thread without React re-renders. Without WebGL it shows a static picture with fixed pins.
 */
export function Globe({ stories, onOpenStory, onSpin, arena, startHere, justDoneId, ref }: Props) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const window = useWindowDimensions();
  // An estimate until onLayout measures the area (same aspect ratio as `styles.area`).
  const [area, setArea] = useState(() => ({ width: window.width, height: window.width / ASPECT }));
  const [fallback, setFallback] = useState(() => FORCE_FALLBACK || !webGLAvailable());
  // The globe is drawn: the first GL frame, or the static picture when there is no GL.
  const [drawn, setDrawn] = useState(false);
  const markDrawn = useCallback(() => setDrawn(true), []);
  const showFallback = useCallback(() => setFallback(true), []);

  const current = stories.find((s) => s.current) ?? stories[0];
  const [selectedId, setSelectedId] = useState(current.id);
  const [calloutOpen, setCalloutOpen] = useState(true);

  const arenaVec = useMemo(() => latLngToVector(arena?.pin ?? ARENA_PIN), [arena?.pin]);

  const pins = useMemo(() => {
    const map = Object.fromEntries(stories.map((s) => [s.id, latLngToVector(s.pin)]));
    if (arena) map.arena = arenaVec;
    return map;
  }, [stories, arena, arenaVec]);

  const start = fallback ? FALLBACK_ORIENTATION : orientationFacing(pins[current.id]);
  const yaw = useSharedValue(start.yaw);
  const pitch = useSharedValue(start.pitch);

  // Flight: progress 0..1 along the arc from `from` to `to`; the view starts at `origin` and follows the plane.
  const flightT = useSharedValue(0);
  const flying = useSharedValue(false);
  const withPlane = useSharedValue(false);
  const from = useSharedValue<Vec3>([0, 0, 1]);
  const to = useSharedValue<Vec3>([0, 0, 1]);
  const origin = useSharedValue<Vec3>([0, 0, 1]);
  // Arrival: progress 0..1 while `arriving`; the globe turns from `spinFrom` to `spinTo` under the plane.
  const arrivalT = useSharedValue(0);
  const arriving = useSharedValue(false);
  const spinFrom = useSharedValue({ yaw: 0, pitch: 0 });
  const spinTo = useSharedValue({ yaw: 0, pitch: 0 });
  const arrivalDest = useSharedValue<Vec3>([0, 0, 1]);
  const rippleT = useSharedValue(0);

  const radius = Math.round(Math.min(area.width, area.height) * RADIUS_SHARE);
  const cx = area.width / 2;
  const cy = area.height / 2;

  useAnimatedReaction(
    () => flightT.value,
    (t) => {
      if (!flying.value) return;
      const span = withPlane.value ? CATCH_UP : 1;
      const w = Math.min(1, t / span);
      const eased = w * w * (3 - 2 * w);
      const centre = slerp(origin.value, slerp(from.value, to.value, t), eased);
      const o = orientationFacing(centre, yaw.value);
      yaw.set(o.yaw);
      pitch.set(o.pitch);
    },
  );

  useAnimatedReaction(
    () => arrivalT.value,
    (t) => {
      if (!arriving.value) return;
      const w = easeOutCubic(Math.min(1, t / ARRIVAL_SPIN_SHARE));
      yaw.set(spinFrom.value.yaw + (spinTo.value.yaw - spinFrom.value.yaw) * w);
      pitch.set(spinFrom.value.pitch + (spinTo.value.pitch - spinFrom.value.pitch) * w);
    },
  );

  const arrive = () => setCalloutOpen(true);

  const finishFlight = () => {
    cancelAnimation(flightT);
    flying.set(false);
    const o = orientationFacing(to.value, yaw.value);
    yaw.set(o.yaw);
    pitch.set(o.pitch);
    arrive();
  };

  const flyTo = (id: string, turnOnly = false) => {
    if (flying.value) {
      // A tap during a flight skips to its end.
      finishFlight();
      return;
    }
    const target = pins[id];
    const previous = selectedId;
    setSelectedId(id);
    setCalloutOpen(false);

    if (fallback) {
      // Cities hidden or half-faded on the picture can't show a callout: go straight to the story.
      if (visibility(target, FALLBACK_ORIENTATION.yaw, FALLBACK_ORIENTATION.pitch) >= FADE_BAND) arrive();
      else if (id === 'arena') arena?.onOpen();
      else if (!turnOnly) onOpenStory(id);
      return;
    }
    launch(id, previous !== id ? pins[previous] : null);
  };

  /** Flies to `id`: with the plane from `start`, or only turning the globe when `start` is null. */
  const launch = (id: string, start: Vec3 | null, duration?: number) => {
    const target = pins[id];
    cancelAnimation(yaw);
    cancelAnimation(pitch);
    // The flight plays even with reduced motion: it is short, started by the user, and the demo's centrepiece.
    // No previous pin (or the same one): only turn the globe there, without the plane.
    const centre = viewCentre(yaw.value, pitch.value);
    from.set(start ?? target);
    to.set(target);
    origin.set(centre);
    withPlane.set(start !== null);
    flightT.set(0);
    flying.set(true);
    flightT.set(
      withTiming(1, { duration: duration ?? flightDuration(start ?? centre, target), easing: FLIGHT_EASING, reduceMotion: ReduceMotion.Never }, (done) => {
        if (!done) return;
        flying.set(false);
        scheduleOnRN(arrive);
      }),
    );
  };

  const face = (id: string) => {
    cancelAnimation(flightT);
    cancelAnimation(yaw);
    cancelAnimation(pitch);
    flying.set(false);
    setSelectedId(id);
    setCalloutOpen(false);
    if (fallback) return;
    const o = orientationFacing(pins[id], yaw.value);
    yaw.set(o.yaw);
    pitch.set(o.pitch);
  };

  /** Ends the arrival where it was heading: globe on the pin, the touchdown ripple, then the callout. */
  const touchDown = () => {
    cancelAnimation(arrivalT);
    arriving.set(false);
    yaw.set(spinTo.value.yaw);
    pitch.set(spinTo.value.pitch);
    rippleT.set(0);
    rippleT.set(withTiming(1, { duration: RIPPLE_MS, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never }));
    arrive();
  };

  // flyIn waits for the first drawn frame: a plane over an empty area would be lost.
  const [arrival, setArrival] = useState<string | null>(null);
  const flyIn = (id: string) => {
    if (fallback) return flyTo(id, true);
    setSelectedId(id);
    setCalloutOpen(false);
    setArrival(id);
  };
  useEffect(() => {
    if (!arrival || !drawn || !pins[arrival]) return;
    const dest = pins[arrival];
    const { lat, lng } = stories.find((s) => s.id === arrival)!.pin;
    // The globe starts turned away (the pin behind the horizon) and spins in, slowing down, while the plane comes in.
    cancelAnimation(flightT);
    cancelAnimation(yaw);
    cancelAnimation(pitch);
    flying.set(false);
    const startO = orientationFacing(latLngToVector({ lat: lat * 0.6, lng: lng - ARRIVAL_SPAN_DEG }), yaw.value);
    yaw.set(startO.yaw);
    pitch.set(startO.pitch);
    const timer = setTimeout(() => {
      setArrival(null);
      spinFrom.set({ yaw: yaw.value, pitch: pitch.value });
      spinTo.set(orientationFacing(dest, yaw.value));
      arrivalDest.set(dest);
      arrivalT.set(0);
      arriving.set(true);
      arrivalT.set(
        withTiming(1, { duration: ARRIVAL_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, (done) => {
          if (done) scheduleOnRN(touchDown);
        }),
      );
    }, ARRIVAL_DELAY_MS);
    return () => clearTimeout(timer);
    // Runs once per requested arrival; the callbacks only read the latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrival, drawn]);

  useImperativeHandle(ref, () => ({ flyTo, face, flyIn }));

  const onRotateStart = () => {
    setCalloutOpen(false);
    onSpin?.();
  };

  const pan = usePanGesture({
    enabled: !fallback,
    minDistance: 4,
    onActivate: () => {
      // Turning the globe cancels a flight (no callout) and any running inertia.
      cancelAnimation(flightT);
      flying.set(false);
      cancelAnimation(arrivalT);
      arriving.set(false);
      cancelAnimation(yaw);
      cancelAnimation(pitch);
      scheduleOnRN(onRotateStart);
    },
    onUpdate: (e) => {
      yaw.set(yaw.value + e.changeX / radius);
      pitch.set(clampPitch(pitch.value + e.changeY / radius));
    },
    onDeactivate: (e) => {
      if (reduced) return;
      yaw.set(withDecay({ velocity: e.velocityX / radius, deceleration: DECELERATION }));
      pitch.set(withDecay({ velocity: e.velocityY / radius, deceleration: DECELERATION, clamp: [-MAX_PITCH, MAX_PITCH] }));
    },
  });

  const onBackgroundPress = () => {
    if (arriving.value) touchDown();
    else if (flying.value) finishFlight();
    else setCalloutOpen(false);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  const selected = stories.find((s) => s.id === selectedId);

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.area} onLayout={onLayout} testID="globe">
        <>
            {/* For e2e and the demo recordings: wait for this before filming or tapping the globe. */}
            {drawn && <View testID="globe-ready" pointerEvents="none" />}
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <Ellipse cx={cx} cy={cy + radius + 18} rx={radius * 0.7} ry={10} fill={colors.brandPrimaryPressed} fillOpacity={0.12} />
              <Circle cx={cx} cy={cy} r={radius + 16} fill="none" stroke={colors.borderStrong} strokeWidth={1} strokeDasharray="3 6" />
            </Svg>
            <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
              {fallback ? (
                <Image
                  onLoad={markDrawn}
                  source={FALLBACK_IMAGE}
                  style={{ position: 'absolute', left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2 }}
                />
              ) : (
                <GlBoundary onError={showFallback}>
                  <Suspense fallback={null}>
                    <GlobeScene radius={radius} yaw={yaw} pitch={pitch} active={focused} onFail={showFallback} onReady={markDrawn} />
                  </Suspense>
                </GlBoundary>
              )}
            </View>
            <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} accessible={false} />
            {stories.map((s) => (
              <Slot key={s.id} v={pins[s.id]} yaw={yaw} pitch={pitch} cx={cx} cy={cy} radius={radius}>
                <GlobePin story={s} state={storyState(s)} justDone={s.id === justDoneId} onPress={() => flyTo(s.id)} />
              </Slot>
            ))}
            {arena && (
              <Slot key="arena" v={arenaVec} yaw={yaw} pitch={pitch} cx={cx} cy={cy} radius={radius}>
                <ArenaPin active={selectedId === 'arena'} onPress={() => flyTo('arena')} />
              </Slot>
            )}
            <PlaneSlot {...{ flightT, flying, withPlane, from, to, yaw, pitch, cx, cy, radius }} />
            <RippleSlot {...{ rippleT, v: arrivalDest, yaw, pitch, cx, cy, radius }} />
            <ArrivalSlot {...{ arrivalT, arriving, dest: arrivalDest, yaw, pitch, cx, cy, radius }} />
            {calloutOpen && selectedId === 'arena' && arena && (
              <CalloutSlot v={arenaVec} yaw={yaw} pitch={pitch} cx={cx} cy={cy} radius={radius} areaWidth={area.width} areaHeight={area.height}>
                <ArenaCallout onOpen={arena.onOpen} />
              </CalloutSlot>
            )}
            {calloutOpen && selectedId !== 'arena' && selected && (
              <CalloutSlot v={pins[selected.id]} yaw={yaw} pitch={pitch} cx={cx} cy={cy} radius={radius} areaWidth={area.width} areaHeight={area.height}>
                <PinCallout
                  story={selected}
                  state={calloutState(selected)}
                  onOpen={() => onOpenStory(selected.id)}
                  startHere={startHere?.storyId === selected.id ? startHere : undefined}
                />
              </CalloutSlot>
            )}
        </>
      </View>
    </GestureDetector>
  );
}

type Projection = { yaw: SharedValue<number>; pitch: SharedValue<number>; cx: number; cy: number; radius: number };

/** Holds a pin with its tip on the city; hidden (and moved off-screen, so untappable) behind the sphere. */
function Slot({ v, yaw, pitch, cx, cy, radius, children }: Projection & { v: Vec3; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const p = project(v, { yaw: yaw.value, pitch: pitch.value }, cx, cy, radius);
    const opacity = fadeOpacity(p.z);
    return {
      opacity,
      zIndex: Math.round(p.z * 100) + 100,
      transform: [{ translateX: opacity > 0 ? p.x - PIN_BOX.width / 2 : -10000 }, { translateY: p.y - PIN_BOX.height }],
    };
  });
  return <Animated.View style={[styles.slot, style]}>{children}</Animated.View>;
}

/** Beside the selected pin, flipped to its left near the right edge, kept inside the globe area. */
function CalloutSlot({
  v,
  yaw,
  pitch,
  cx,
  cy,
  radius,
  areaWidth,
  areaHeight,
  children,
}: Projection & { v: Vec3; areaWidth: number; areaHeight: number; children: ReactNode }) {
  const height = useSharedValue(110);
  const style = useAnimatedStyle(() => {
    const p = project(v, { yaw: yaw.value, pitch: pitch.value }, cx, cy, radius);
    // Only beside a fully visible pin: a half-faded callout at the horizon would cover other pins.
    const shown = p.z >= FADE_BAND;
    // Clears the head of the active pin (a 44 px square turned 45°).
    const gap = 30;
    const right = p.x + gap;
    const x = right + CALLOUT_WIDTH > areaWidth - EDGE ? p.x - gap - CALLOUT_WIDTH : right;
    const y = Math.min(areaHeight - height.value - EDGE, Math.max(EDGE, p.y - PIN_BOX.height));
    return { transform: [{ translateX: shown ? Math.max(EDGE, x) : -10000 }, { translateY: y }] };
  });
  return (
    <Animated.View style={[styles.slot, styles.callout, style]} onLayout={(e) => height.set(e.nativeEvent.layout.height)}>
      {children}
    </Animated.View>
  );
}

type PlaneProps = Projection & {
  flightT: SharedValue<number>;
  flying: SharedValue<boolean>;
  withPlane: SharedValue<boolean>;
  from: SharedValue<Vec3>;
  to: SharedValue<Vec3>;
};

/** The plane on the flight arc, turned along the arc's on-screen direction. */
function PlaneSlot({ flightT, flying, withPlane, from, to, yaw, pitch, cx, cy, radius }: PlaneProps) {
  const style = useAnimatedStyle(() => {
    if (!flying.value || !withPlane.value) return { opacity: 0, transform: [{ translateX: -10000 }] };
    const t = flightT.value;
    const o = { yaw: yaw.value, pitch: pitch.value };
    const p = project(flightPoint(from.value, to.value, t), o, cx, cy, radius);
    const ahead = project(flightPoint(from.value, to.value, Math.min(1, t + 0.02)), o, cx, cy, radius);
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

type ArrivalProps = Projection & { arrivalT: SharedValue<number>; arriving: SharedValue<boolean>; dest: SharedValue<Vec3> };

/**
 * The arrival plane: it comes in big from beyond the top-left corner, as if from far away, and glides down a curve
 * onto the destination pin, shrinking to its normal size as it lands. The curve's end follows the pin while the
 * globe is still turning, so it touches down exactly on it.
 */
function ArrivalSlot({ arrivalT, arriving, dest, yaw, pitch, cx, cy, radius }: ArrivalProps) {
  const style = useAnimatedStyle(() => {
    if (!arriving.value) return { opacity: 0, transform: [{ translateX: -10000 }] };
    const t = arrivalT.value;
    // Slow start, then a long glide that settles at the end.
    const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    const end = project(dest.value, { yaw: yaw.value, pitch: pitch.value }, cx, cy, radius);
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
function RippleSlot({ rippleT, v, yaw, pitch, cx, cy, radius }: Projection & { rippleT: SharedValue<number>; v: SharedValue<Vec3> }) {
  const style = useAnimatedStyle(() => {
    const t = rippleT.value;
    if (t <= 0 || t >= 1) return { opacity: 0, transform: [{ translateX: -10000 }] };
    const p = project(v.value, { yaw: yaw.value, pitch: pitch.value }, cx, cy, radius);
    return {
      opacity: (1 - t) * 0.8,
      transform: [{ translateX: p.x - RIPPLE_SIZE / 2 }, { translateY: p.y - RIPPLE_SIZE / 2 }, { scale: 0.3 + t * 2.2 }],
    };
  });
  return <Animated.View style={[styles.slot, styles.ripple, style]} pointerEvents="none" />;
}

/** Any error from the 3D canvas (no GL context, shader failure) switches the globe to the static picture. */
class GlBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const styles = StyleSheet.create({
  area: { width: '100%', aspectRatio: ASPECT },
  slot: { position: 'absolute', left: 0, top: 0 },
  callout: { zIndex: 300 },
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
