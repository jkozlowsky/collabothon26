import { useIsFocused } from 'expo-router';
import { lazy, Suspense, useCallback, useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { Image, Platform, Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ArenaCallout } from '@/components/globe/ArenaCallout';
import { ArenaPin } from '@/components/globe/ArenaPin';
import { CalloutSlot } from '@/components/globe/CalloutSlot';
import { FlightLayer } from '@/components/globe/FlightLayer';
import { GlBoundary } from '@/components/globe/GlBoundary';
import {
  ARRIVAL_DELAY_MS,
  ARRIVAL_MS,
  ARRIVAL_SPAN_DEG,
  ARRIVAL_SPIN_SHARE,
  ASPECT,
  CANVAS_BELOW,
  CATCH_UP,
  clampZoom,
  DECELERATION,
  easeOutCubic,
  FLIGHT_EASING,
  IDLE_MS,
  IDLE_RAMP_MS,
  IDLE_SPEED,
  RADIUS_SHARE,
  REVEAL_MS,
  RIPPLE_MS,
  WHEEL_ZOOM,
} from '@/components/globe/globeConfig';
import { GlobeHalo } from '@/components/globe/GlobeHalo';
import { GlobePin } from '@/components/globe/GlobePin';
import { PinCallout } from '@/components/globe/PinCallout';
import { PinSlot } from '@/components/globe/PinSlot';
import {
  clampPitch,
  FADE_BAND,
  FALLBACK_CENTER,
  flightDuration,
  latLngToVector,
  MAX_PITCH,
  orientationFacing,
  slerp,
  toRad,
  viewCentre,
  visibility,
  type Vec3,
} from '@/lib/geo';
import { calloutState, storyState } from '@/lib/stories';
import type { Story } from '@/types/stories';

// Loaded on first use: keeps three.js out of every other screen's bundle and out of the jest route tree.
let sceneModule: Promise<typeof import('@/components/globe/GlobeScene')> | null = null;
const loadScene = () => (sceneModule ??= import('@/components/globe/GlobeScene'));
const GlobeScene = lazy(() => loadScene().then((m) => ({ default: m.GlobeScene })));

/**
 * Loads three.js and the land texture ahead of the Map, so the globe is drawn by the time the user gets there.
 * Call it from the screens before the Map (the quick check, the path summary). Safe to call more than once.
 */
export function preloadGlobe() {
  if (FORCE_FALLBACK || !webGLAvailable()) return;
  loadScene()
    .then((m) => m.preloadLand())
    // A failed preload only costs the head start: the Map loads the globe again and falls back on its own.
    .catch(() => {
      sceneModule = null;
    });
}

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
  /** Px the canvas reaches above the area, up to whatever covers it (the screen's header), for a zoomed-in sphere. */
  reachUp?: number;
  ref?: Ref<GlobeHandle>;
};

/** Default arena pin: Lisbon. Rome sat right under the Berlin pin. */
const ARENA_PIN = { lat: 38.72, lng: -9.14 };
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

/**
 * The 3D globe of the Map tab: a three.js sphere with RN pins, plane and callout laid over it.
 * Orientation lives in Reanimated shared values, so dragging, inertia, flights and the overlay all run
 * on the UI thread without React re-renders. Without WebGL it shows a static picture with fixed pins.
 */
export function Globe({ stories, onOpenStory, onSpin, arena, startHere, justDoneId, reachUp = 0, ref }: Props) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();
  // An estimate until onLayout measures the area (same aspect ratio as `styles.area`).
  const [area, setArea] = useState(() => ({ width: windowWidth, height: windowWidth / ASPECT }));
  const [fallback, setFallback] = useState(() => FORCE_FALLBACK || !webGLAvailable());
  // The globe is drawn: the first GL frame, or the static picture when there is no GL.
  const [drawn, setDrawn] = useState(false);
  const markDrawn = useCallback(() => setDrawn(true), []);
  const showFallback = useCallback(() => setFallback(true), []);
  // Nothing shows until the sphere is drawn: no pins floating over an empty area, then a short fade in.
  const shown = useSharedValue(0);
  useEffect(() => {
    if (drawn) shown.set(withTiming(1, { duration: REVEAL_MS, easing: Easing.out(Easing.quad) }));
  }, [drawn, shown]);
  const reveal = useAnimatedStyle(() => ({ opacity: shown.value }));

  const current = stories.find((s) => s.current) ?? stories[0];
  const [selectedId, setSelectedId] = useState(current.id);
  const [calloutOpen, setCalloutOpen] = useState(true);

  const arenaVec = useMemo(() => latLngToVector(arena?.pin ?? ARENA_PIN), [arena?.pin]);

  const pins = useMemo(() => {
    const map = Object.fromEntries(stories.map((s) => [s.id, latLngToVector(s.pin)]));
    if (arena) map.arena = arenaVec;
    return map;
  }, [stories, arena, arenaVec]);

  const initialView = fallback ? FALLBACK_ORIENTATION : orientationFacing(pins[current.id]);
  const yaw = useSharedValue(initialView.yaw);
  const pitch = useSharedValue(initialView.pitch);

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
  // Pinch zoom: the sphere and the projection of every overlay scale by it.
  const zoom = useSharedValue(1);
  // Idle spin: ms since the last touch, counted only while nothing is selected, moving or held.
  const idle = useSharedValue(0);
  const holding = useSharedValue(false);
  const calloutShown = useSharedValue(true);
  const pinchStart = useSharedValue(1);

  const radius = Math.round(Math.min(area.width, area.height) * RADIUS_SHARE);
  const cx = area.width / 2;
  const cy = area.height / 2;
  // How far the canvas reaches below the area; pins outside the canvas are hidden.
  const below = Math.round(area.height * CANVAS_BELOW);
  const projection = { yaw, pitch, cx, cy, radius, zoom };

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
    zoom.set(1);
    setSelectedId(id);
    setCalloutOpen(false);
    setArrival(id);
  };
  /** Turns the globe away from the story's pin and, after a pause, starts the arrival. Returns the pause's cancel. */
  const beginArrival = useEffectEvent((id: string) => {
    const story = stories.find((s) => s.id === id);
    if (!story) return;
    const dest = pins[story.id];
    const { lat, lng } = story.pin;
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
  });
  // Once per requested arrival: an Effect Event, so a lessons reload (new `stories`) does not restart the pause.
  useEffect(() => {
    if (!arrival || !drawn) return;
    return beginArrival(arrival);
  }, [arrival, drawn]);

  useImperativeHandle(ref, () => ({ flyTo, face, flyIn }));

  const onRotateStart = () => {
    setCalloutOpen(false);
    onSpin?.();
  };

  // With no callout open the globe turns slowly by itself; any touch, flight or selection stops it.
  useEffect(() => {
    calloutShown.set(calloutOpen);
  }, [calloutOpen, calloutShown]);
  const spin = useFrameCallback((frame) => {
    const dt = frame.timeSincePreviousFrame ?? 0;
    if (calloutShown.value || flying.value || arriving.value || holding.value) {
      idle.set(0);
      return;
    }
    idle.set(idle.value + dt);
    const ramp = Math.min(1, (idle.value - IDLE_MS) / IDLE_RAMP_MS);
    if (ramp > 0) yaw.set(yaw.value + IDLE_SPEED * ramp * dt);
  }, false);
  // Plays with reduced motion too, like the flights: one slow turn a minute that any touch stops.
  useEffect(() => {
    spin.setActive(focused && drawn && !fallback);
  }, [spin, focused, drawn, fallback]);

  const pan = usePanGesture({
    enabled: !fallback,
    minDistance: 4,
    onActivate: () => {
      holding.set(true);
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
      // Zoomed in, the same drag turns the globe less, so the map stays under the finger.
      const r = radius * zoom.value;
      yaw.set(yaw.value + e.changeX / r);
      pitch.set(clampPitch(pitch.value + e.changeY / r));
    },
    onDeactivate: (e) => {
      holding.set(false);
      idle.set(0);
      if (reduced) return;
      const r = radius * zoom.value;
      yaw.set(withDecay({ velocity: e.velocityX / r, deceleration: DECELERATION }));
      pitch.set(withDecay({ velocity: e.velocityY / r, deceleration: DECELERATION, clamp: [-MAX_PITCH, MAX_PITCH] }));
    },
  });

  const pinch = usePinchGesture({
    enabled: !fallback,
    onActivate: () => {
      holding.set(true);
      pinchStart.set(zoom.value);
      scheduleOnRN(setCalloutOpen, false);
    },
    onUpdate: (e) => {
      zoom.set(clampZoom(pinchStart.value * e.scale));
    },
    onDeactivate: () => {
      holding.set(false);
      idle.set(0);
    },
  });
  const gestures = useSimultaneousGestures(pan, pinch);

  // Web: the mouse wheel (and a trackpad pinch, which browsers send as a wheel) zooms too.
  // There the View's ref is its DOM node, which the React Native types do not know: hence the cast on `ref`.
  const areaRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = areaRef.current;
    if (Platform.OS !== 'web' || fallback || !node?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      idle.set(0);
      zoom.set(clampZoom(zoom.value * Math.exp(-e.deltaY * WHEEL_ZOOM)));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [fallback, zoom, idle]);

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
    <GestureDetector gesture={gestures}>
      <View ref={areaRef as never} style={styles.area} onLayout={onLayout} testID="globe">
        <Animated.View style={[StyleSheet.absoluteFill, reveal]}>
          {/* For e2e and the demo recordings: wait for this before filming or tapping the globe. */}
          {drawn && <View testID="globe-ready" pointerEvents="none" />}
          <GlobeHalo width={area.width} height={area.height} radius={radius} zoom={zoom} />
          <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
            {fallback ? (
              <Image
                onLoad={markDrawn}
                source={FALLBACK_IMAGE}
                style={[styles.fallback, { left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2 }]}
              />
            ) : (
              // The canvas runs on past the area (under the header, the hint and the sheet), so a zoomed-in sphere is not cut at the area's edge.
              <View style={[styles.canvas, { top: -reachUp, height: reachUp + area.height + below }]}>
                <GlBoundary onError={showFallback}>
                  <Suspense fallback={null}>
                    <GlobeScene
                      radius={radius}
                      yaw={yaw}
                      pitch={pitch}
                      zoom={zoom}
                      offsetY={(below - reachUp) / 2}
                      active={focused}
                      onFail={showFallback}
                      onReady={markDrawn}
                    />
                  </Suspense>
                </GlBoundary>
              </View>
            )}
          </View>
          <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} accessible={false} />
          {stories.map((s) => (
            <PinSlot key={s.id} v={pins[s.id]} {...projection} below={below} above={reachUp}>
              <GlobePin story={s} state={storyState(s)} justDone={s.id === justDoneId} onPress={() => flyTo(s.id)} />
            </PinSlot>
          ))}
          {arena && (
            <PinSlot key="arena" v={arenaVec} {...projection} below={below} above={reachUp}>
              <ArenaPin active={selectedId === 'arena'} onPress={() => flyTo('arena')} />
            </PinSlot>
          )}
          <FlightLayer
            {...projection}
            flightT={flightT}
            flying={flying}
            withPlane={withPlane}
            from={from}
            to={to}
            rippleT={rippleT}
            arrivalT={arrivalT}
            arriving={arriving}
            arrivalDest={arrivalDest}
          />
          {calloutOpen && selectedId === 'arena' && arena && (
            <CalloutSlot v={arenaVec} {...projection} areaWidth={area.width} areaHeight={area.height}>
              <ArenaCallout onOpen={arena.onOpen} />
            </CalloutSlot>
          )}
          {calloutOpen && selectedId !== 'arena' && selected && (
            <CalloutSlot v={pins[selected.id]} {...projection} areaWidth={area.width} areaHeight={area.height}>
              <PinCallout
                story={selected}
                state={calloutState(selected)}
                onOpen={() => onOpenStory(selected.id)}
                startHere={startHere?.storyId === selected.id ? startHere : undefined}
              />
            </CalloutSlot>
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  area: { width: '100%', aspectRatio: ASPECT },
  fallback: { position: 'absolute' },
  canvas: { position: 'absolute', left: 0, right: 0, top: 0 },
});
