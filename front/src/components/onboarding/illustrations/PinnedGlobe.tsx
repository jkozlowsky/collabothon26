import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { GLOBE_VIEW, GlobeSphere } from '@/components/onboarding/Globe';
import { EASE_IN_OUT, EASE_OUT } from '@/components/onboarding/ui';
import { colors, illustrationShadow, radii } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type GlobePin = {
  x: number;
  y: number;
  color: string;
  icon: IconName;
  city: string;
  topic: string;
  title: string;
  /** Progress line shown on the lesson card. */
  meta: string;
  state?: 'done' | 'active' | 'locked';
};

type Props = {
  size: number;
  pins?: GlobePin[];
  /** Index of the highlighted pin (drawn larger, with a glow under it). */
  selected?: number;
};

/** Lesson paths on the onboarding globe: one pin per topic, set in a real place. */
export const GLOBE_PINS: GlobePin[] = [
  { x: 82, y: 108, color: colors.onboardingPinSlate, icon: 'lock-closed', city: 'Reykjavik', topic: 'Retirement', title: 'Money for later', meta: 'Coming soon', state: 'locked' },
  { x: 132, y: 92, color: colors.storyRose, icon: 'flower', city: 'Amsterdam', topic: 'Risk', title: 'When a price only goes up', meta: 'Completed · 5 of 5', state: 'done' },
  { x: 170, y: 106, color: colors.brandAccent, icon: 'shield-checkmark', city: 'Berlin', topic: 'Saving', title: 'Safe money that shrinks', meta: 'Mission 1 of 5 · 5 min', state: 'active' },
  { x: 240, y: 162, color: colors.storyOrange, icon: 'server', city: 'Mumbai', topic: 'Gold & safe havens', title: 'Why gold glitters', meta: '5 lessons · 3 min each' },
  { x: 140, y: 182, color: colors.onboardingPinViolet, icon: 'wallet', city: 'Lagos', topic: 'Borrowing', title: 'Twelve easy payments', meta: '5 missions · 4 min each' },
  { x: 172, y: 238, color: colors.onboardingPinTeal, icon: 'leaf', city: 'Nairobi', topic: 'Saving', title: 'Saving on the go', meta: '5 lessons · 4 min each' },
  { x: 52, y: 214, color: colors.feedbackDanger, icon: 'pricetag', city: 'Buenos Aires', topic: 'Inflation', title: 'When prices run away', meta: '4 lessons · 4 min each' },
];

/** The lesson in progress, highlighted on the globe and shown on its card. */
export const ACTIVE_PIN = GLOBE_PINS.findIndex((p) => p.state === 'active');

/** Pins drop onto the globe one after another; the highlighted one's glow breathes. */
const PIN_DROP = {
  from: { opacity: 0, transform: [{ translateY: -14 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};
const PIN_DROP_MS = 420;
const PIN_DROP_DELAY_MS = 200;
const PIN_DROP_STAGGER_MS = 90;
const BREATHE = { from: { opacity: 0.25, transform: [{ scale: 0.85 }] }, to: { opacity: 0.55, transform: [{ scale: 1.15 }] } };
const BREATHE_MS = 1600;
/** The glow under the highlighted pin, in globe units. */
const GLOW = { width: 56, height: 20 };
/** Pin head size in globe units. */
const PIN_SIZE = 40;
const PIN_SIZE_SELECTED = 50;

/** The globe with lesson pins on top. Decorative. */
export function PinnedGlobe({ size, pins = GLOBE_PINS, selected }: Props) {
  const reduced = useReducedMotion();
  const scale = size / GLOBE_VIEW;
  const sel = selected === undefined ? undefined : pins[selected];
  return (
    <View style={{ width: size, height: size }}>
      <GlobeSphere size={size} />
      {sel && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              left: (sel.x - GLOW.width / 2) * scale,
              top: (sel.y - GLOW.height / 2) * scale,
              width: GLOW.width * scale,
              height: GLOW.height * scale,
              backgroundColor: sel.color,
            },
            !reduced && {
              animationName: BREATHE,
              animationDuration: BREATHE_MS,
              animationDirection: 'alternate',
              animationIterationCount: 'infinite',
              animationTimingFunction: EASE_IN_OUT,
            },
          ]}
        />
      )}
      {pins.map((p, i) => (
        <Pin
          key={p.city}
          pin={p}
          scale={scale}
          selected={i === selected}
          delay={reduced ? undefined : PIN_DROP_DELAY_MS + i * PIN_DROP_STAGGER_MS}
        />
      ))}
    </View>
  );
}

type PinProps = { pin: GlobePin; scale: number; selected: boolean; delay?: number };

function Pin({ pin, scale, selected, delay }: PinProps) {
  // The highlighted pin is drawn larger rather than scaled, so it stays crisp.
  const s = Math.round((selected ? PIN_SIZE_SELECTED : PIN_SIZE) * scale);
  // A square with three round corners, turned 45°, reads as a map pin; its tip sits on (x, y).
  const tip = s * Math.SQRT1_2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pinWrap,
        {
          left: pin.x * scale - s / 2,
          top: pin.y * scale - s / 2 - tip,
          width: s,
          height: s,
          zIndex: selected ? 2 : 1,
        },
        delay !== undefined && {
          animationName: PIN_DROP,
          animationDuration: PIN_DROP_MS,
          animationDelay: delay,
          animationFillMode: 'backwards',
          animationTimingFunction: EASE_OUT,
        },
      ]}
    >
      <View
        style={[
          styles.pin,
          {
            width: s,
            height: s,
            borderRadius: s / 2,
            borderBottomRightRadius: 0,
            backgroundColor: pin.color,
            borderWidth: Math.max(2, 3 * scale),
          },
        ]}
      />
      <Ionicons name={pin.icon} size={Math.round(s * 0.42)} color={pin.state === 'active' ? colors.brandPrimary : colors.textOnBrand} />
      {pin.state === 'done' && (
        <View style={[styles.badge, { width: s * 0.46, height: s * 0.46, borderRadius: s * 0.23 }]}>
          <Ionicons name="checkmark" size={Math.round(s * 0.3)} color={colors.textOnBrand} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', borderRadius: radii.pill, opacity: 0.45 },
  pinWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pin: {
    position: 'absolute',
    borderColor: colors.bgSurface,
    transform: [{ rotate: '45deg' }],
    ...illustrationShadow.pin,
  },
  badge: {
    position: 'absolute',
    top: '-18%',
    right: '-22%',
    backgroundColor: colors.feedbackSuccess,
    borderWidth: 2,
    borderColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
