import Ionicons from '@expo/vector-icons/Ionicons';
import { useId, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type CSSStyle } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { EASE_IN_OUT, motion, Tappable } from '@/components/onboarding/ui';
import { colors } from '@/constants/theme';

/** All globe geometry lives in a 300×300 box; it is scaled to `size`. */
const VIEW = 300;
const C = 150;
const R = 140;

const LAND = [
  // Greenland
  'M70 66 L98 58 L110 72 L100 92 L80 96 L66 84 Z',
  // Europe
  'M118 96 L140 82 L166 86 L184 76 L206 88 L200 106 L184 112 L172 124 L150 122 L132 116 Z',
  // Africa
  'M122 140 L154 130 L184 136 L200 152 L196 176 L184 198 L174 226 L160 244 L150 234 L146 210 L132 194 L116 180 L114 158 Z',
  // Arabia and India
  'M210 120 L244 110 L272 122 L278 146 L262 168 L242 174 L228 158 L214 144 Z',
  // Madagascar
  'M206 210 L214 202 L220 220 L212 234 Z',
  // South America
  'M26 176 L56 166 L74 182 L70 210 L56 244 L40 252 L30 226 Z',
];

type IconName = ComponentProps<typeof Ionicons>['name'];

export type GlobePin = {
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

/** Lesson paths on the onboarding globe: one pin per topic, set in a real place. */
export const GLOBE_PINS: GlobePin[] = [
  { x: 82, y: 108, color: '#9AA6AB', icon: 'lock-closed', city: 'Reykjavik', topic: 'Risk & scams', title: 'Too good to be true', meta: 'Unlocks after 2 more lessons', state: 'locked' },
  { x: 132, y: 92, color: '#D9577A', icon: 'flower', city: 'Amsterdam', topic: 'Bubbles & hype', title: 'Tulip mania', meta: 'Completed · 6 of 6', state: 'done' },
  { x: 170, y: 106, color: colors.brandAccent, icon: 'trending-up', city: 'Frankfurt', topic: 'Investing', title: 'Your first share', meta: 'Lesson 3 of 6 · 4 min', state: 'active' },
  { x: 240, y: 162, color: '#E8833A', icon: 'server', city: 'Mumbai', topic: 'Gold & safe havens', title: 'Why gold glitters', meta: '5 lessons · 3 min each' },
  { x: 140, y: 182, color: '#7A5AF8', icon: 'wallet', city: 'Lagos', topic: 'Budgeting', title: 'Where does it all go?', meta: '4 lessons · 3 min each' },
  { x: 172, y: 238, color: '#1F9AA0', icon: 'leaf', city: 'Nairobi', topic: 'Saving', title: 'Saving on the go', meta: '5 lessons · 4 min each' },
  { x: 52, y: 214, color: '#D64545', icon: 'pricetag', city: 'Buenos Aires', topic: 'Inflation', title: 'When prices run away', meta: '4 lessons · 4 min each' },
];

/** The globe sphere: ocean, grid and land, without pins. */
export function GlobeSphere({ size }: { size: number }) {
  // Unique ids: the bank shows several globes at once, and on web a shared id can point at a hidden copy.
  const uid = useId().replace(/:/g, '');
  const parallels = [-0.7, -0.35, 0, 0.35, 0.7].map((f) => {
    const y = C + f * R;
    const half = Math.sqrt(R * R - (f * R) ** 2);
    return { y, x1: C - half, x2: C + half };
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      <Defs>
        <RadialGradient id={`ocean-${uid}`} cx="38%" cy="32%" r="75%">
          <Stop offset="0" stopColor="#3C8C99" />
          <Stop offset="0.45" stopColor="#0E4A59" />
          <Stop offset="1" stopColor={colors.brandPrimary} />
        </RadialGradient>
        <ClipPath id={`sphere-${uid}`}>
          <Circle cx={C} cy={C} r={R} />
        </ClipPath>
      </Defs>
      <Circle cx={C} cy={C} r={R} fill={`url(#ocean-${uid})`} />
      <G clipPath={`url(#sphere-${uid})`}>
        {parallels.map((p) => (
          <Line key={p.y} x1={p.x1} y1={p.y} x2={p.x2} y2={p.y} stroke="#fff" strokeOpacity={0.12} strokeWidth={1.2} />
        ))}
        {[0.33, 0.66, 0.92].map((f) => (
          <Ellipse key={f} cx={C} cy={C} rx={R * f} ry={R} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={1.2} />
        ))}
        <Line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#fff" strokeOpacity={0.12} strokeWidth={1.2} />
        {LAND.map((d) => (
          <Path key={d} d={d} fill="#D7EAE3" fillOpacity={0.88} stroke="#fff" strokeOpacity={0.3} strokeLinejoin="round" />
        ))}
      </G>
    </Svg>
  );
}

type GlobeProps = {
  size: number;
  pins?: GlobePin[];
  /** Index of the highlighted pin. */
  selected?: number;
  onSelect?: (index: number) => void;
};

/** The globe with lesson pins on top. Tapping a pin highlights it. */
export function Globe({ size, pins = GLOBE_PINS, selected, onSelect }: GlobeProps) {
  const scale = size / VIEW;
  const sel = selected === undefined ? undefined : pins[selected];
  return (
    <View style={{ width: size, height: size }}>
      <GlobeSphere size={size} />
      {sel && (
        // The glow is childless and absolutely placed, so moving it with a transform is cheap.
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            glowMotion,
            {
              width: 56 * scale,
              height: 20 * scale,
              backgroundColor: sel.color,
              transform: [{ translateX: (sel.x - 28) * scale }, { translateY: (sel.y - 10) * scale }],
            },
          ]}
        />
      )}
      {pins.map((p, i) => (
        <Pin key={p.city} pin={p} scale={scale} selected={i === selected} onPress={onSelect && (() => onSelect(i))} />
      ))}
    </View>
  );
}

function Pin({ pin, scale, selected, onPress }: { pin: GlobePin; scale: number; selected: boolean; onPress?: () => void }) {
  const s = Math.round(40 * scale);
  // A square with three round corners, turned 45°, reads as a map pin; its tip sits on (x, y).
  const tip = s * Math.SQRT1_2;
  return (
    <Tappable
      onPress={onPress}
      disabled={!onPress}
      haptic="selection"
      pressedScale={0.88}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${pin.city}: ${pin.title}`}
      accessibilityState={{ selected }}
      testID={`pin-${pin.city}`}
      containerStyle={{ position: 'absolute', left: pin.x * scale - s / 2, top: pin.y * scale - s / 2 - tip, zIndex: selected ? 2 : 1 }}
    >
      {/* Grows from its tip, so the selected pin lifts off the map instead of swelling sideways. */}
      <Animated.View
        style={[
          styles.pinWrap,
          motion.lift,
          {
            width: s,
            height: s,
            transformOrigin: ['50%', `${50 + (tip / s) * 100}%`, 0],
            transform: [{ scale: selected ? 1.28 : 1 }],
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
        <Ionicons name={pin.icon} size={Math.round(s * 0.42)} color={pin.state === 'active' ? colors.brandPrimary : '#fff'} />
        {pin.state === 'done' && (
          <View style={[styles.badge, { width: s * 0.46, height: s * 0.46, borderRadius: s * 0.23 }]}>
            <Ionicons name="checkmark" size={Math.round(s * 0.3)} color="#fff" />
          </View>
        )}
      </Animated.View>
    </Tappable>
  );
}

const glowMotion = {
  transitionProperty: ['transform', 'backgroundColor'],
  transitionDuration: 360,
  transitionTimingFunction: EASE_IN_OUT,
} satisfies CSSStyle;

const styles = StyleSheet.create({
  glow: { position: 'absolute', left: 0, top: 0, borderRadius: 999, opacity: 0.45 },
  pinWrap: { alignItems: 'center', justifyContent: 'center' },
  pin: {
    position: 'absolute',
    borderColor: '#fff',
    transform: [{ rotate: '45deg' }],
    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)',
  },
  badge: {
    position: 'absolute',
    top: '-18%',
    right: '-22%',
    backgroundColor: colors.feedbackSuccess,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
