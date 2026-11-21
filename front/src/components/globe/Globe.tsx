import { useIsFocused } from 'expo-router';
import { Component, lazy, Suspense, useCallback, useImperativeHandle, useMemo, useState, type ReactNode, type Ref } from 'react';
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
  /** Same as tapping the story's pin: fly there and open its callout. */
  flyTo: (id: string) => void;
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
  /** Extra pin at Rome for the duel arena. */
  arena?: ArenaConfig;
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
export function Globe({ stories, onOpenStory, onSpin, arena, ref }: Props) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const window = useWindowDimensions();
  // An estimate until onLayout measures the area (same aspect ratio as `styles.area`).
  const [area, setArea] = useState(() => ({ width: window.width, height: window.width / ASPECT }));
  const [fallback, setFallback] = useState(() => FORCE_FALLBACK || !webGLAvailable());
  const showFallback = useCallback(() => setFallback(true), []);

  const current = stories.find((s) => s.current) ?? stories[0];
  const [selectedId, setSelectedId] = useState(current.id);
  const [calloutOpen, setCalloutOpen] = useState(true);

  const arenaVec = useMemo(() => latLngToVector(arena?.pin ?? { lat: 41.89, lng: 12.49 }), [arena?.pin]);

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

  const arrive = () => setCalloutOpen(true);

  const finishFlight = () => {
    cancelAnimation(flightT);
    flying.set(false);
    const o = orientationFacing(to.value, yaw.value);
    yaw.set(o.yaw);
    pitch.set(o.pitch);
    arrive();
  };

  const flyTo = (id: string) => {
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
      else onOpenStory(id);
      return;
    }
    cancelAnimation(yaw);
    cancelAnimation(pitch);
    // The flight plays even with reduced motion: it is short, started by the user, and the demo's centrepiece.
    // No previous pin (or the same one): only turn the globe there, without the plane.
    const plane = previous !== id;
    const centre = viewCentre(yaw.value, pitch.value);
    from.set(plane ? pins[previous] : target);
    to.set(target);
    origin.set(centre);
    withPlane.set(plane);
    flightT.set(0);
    flying.set(true);
    const duration = flightDuration(plane ? pins[previous] : centre, target);
    flightT.set(
      withTiming(1, { duration, easing: FLIGHT_EASING, reduceMotion: ReduceMotion.Never }, (done) => {
        if (!done) return;
        flying.set(false);
        scheduleOnRN(arrive);
      }),
    );
  };

  useImperativeHandle(ref, () => ({ flyTo }));

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
    if (flying.value) finishFlight();
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
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <Ellipse cx={cx} cy={cy + radius + 18} rx={radius * 0.7} ry={10} fill={colors.brandPrimaryPressed} fillOpacity={0.12} />
              <Circle cx={cx} cy={cy} r={radius + 16} fill="none" stroke={colors.borderStrong} strokeWidth={1} strokeDasharray="3 6" />
            </Svg>
            <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
              {fallback ? (
                <Image
                  source={FALLBACK_IMAGE}
                  style={{ position: 'absolute', left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2 }}
                />
              ) : (
                <GlBoundary onError={showFallback}>
                  <Suspense fallback={null}>
                    <GlobeScene radius={radius} yaw={yaw} pitch={pitch} active={focused} onFail={showFallback} />
                  </Suspense>
                </GlBoundary>
              )}
            </View>
            <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} accessible={false} />
            {stories.map((s) => (
              <Slot key={s.id} v={pins[s.id]} yaw={yaw} pitch={pitch} cx={cx} cy={cy} radius={radius}>
                <GlobePin story={s} state={storyState(s)} onPress={() => flyTo(s.id)} />
              </Slot>
            ))}
            {arena && (
              <Slot key="arena" v={arenaVec} yaw={yaw} pitch={pitch} cx={cx} cy={cy} radius={radius}>
                <ArenaPin active={selectedId === 'arena'} onPress={() => flyTo('arena')} />
              </Slot>
            )}
            <PlaneSlot {...{ flightT, flying, withPlane, from, to, yaw, pitch, cx, cy, radius }} />
            {calloutOpen && (
              selectedId === 'arena' && arena ? (
                <CalloutSlot v={arenaVec} yaw={yaw} pitch={pitch} cx={cx} cy={cy} radius={radius} areaWidth={area.width} areaHeight={area.height}>
                  <ArenaCallout onOpen={arena.onOpen} />
                </CalloutSlot>
              ) : selected ? (
                <CalloutSlot v={pins[selected.id]} yaw={yaw} pitch={pitch} cx={cx} cy={cy} radius={radius} areaWidth={area.width} areaHeight={area.height}>
                  <PinCallout story={selected} state={calloutState(selected)} onOpen={() => onOpenStory(selected.id)} />
                </CalloutSlot>
              ) : null
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
});
