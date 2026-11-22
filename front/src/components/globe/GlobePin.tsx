import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion, ZoomIn, type CSSStyle } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, storyColors } from '@/constants/theme';
import { calloutState, storyLabel, type StoryState } from '@/lib/stories';
import type { Story } from '@/types/stories';

type Props = {
  story: Story;
  state: StoryState;
  /** The path was finished just now: the check pops in. */
  justDone?: boolean;
  onPress: () => void;
};

/** The pin's touch box. Its bottom-centre is the pin tip, which the globe places on the city. */
export const PIN_BOX = { width: 60, height: 64 } as const;

/** Head of a pin: a square turned 45° with one sharp corner, which reads as a pin; that corner is the tip. The active pin is larger. */
export function pinHead(active: boolean) {
  const size = active ? 44 : 36;
  const top = PIN_BOX.height - size * Math.SQRT1_2 - size / 2;
  return {
    size,
    iconSize: active ? 20 : 16,
    box: { width: size, height: size, left: (PIN_BOX.width - size) / 2, top },
    // Three round corners, set one by one: react-native-web lets a `borderRadius` shorthand win over a longhand.
    corners: { borderTopLeftRadius: size / 2, borderTopRightRadius: size / 2, borderBottomLeftRadius: size / 2 },
  };
}

/** Figma "Globe Pin": a teardrop in the story colour; the current one is larger and yellow, with a pulse. */
export function GlobePin({ story, state, justDone, onPress }: Props) {
  const reduced = useReducedMotion();
  const active = state === 'active';
  const locked = state === 'comingSoon';
  const head = pinHead(active);
  const progress = calloutState(story);
  const badgeAt = { left: head.box.left + head.size - 10, top: head.box.top - 6 };
  const fill = active ? colors.brandAccent : locked ? colors.storySlate : storyColors[story.color];

  return (
    <Tappable
      onPress={onPress}
      haptic="selection"
      pressedScale={0.9}
      accessibilityRole="button"
      accessibilityLabel={storyLabel(story)}
      testID={`globe-pin-${story.id}`}
      style={styles.box}
    >
      {active && <Animated.View style={[styles.pulse, !reduced && pulse]} />}
      <View style={[styles.head, head.box, head.corners, { backgroundColor: fill }]} />
      <View style={[styles.icon, head.box]}>
        <Feather name={locked ? 'lock' : story.icon} size={head.iconSize} color={active ? colors.textOnAccent : colors.textOnBrand} />
      </View>
      {progress === 'done' && (
        // Keyed so a fresh finish remounts the badge and plays its entrance.
        <Animated.View
          key={justDone ? 'new' : 'old'}
          entering={justDone && !reduced ? ZoomIn.springify().damping(9).delay(250) : undefined}
          style={[styles.badge, styles.badgeDone, badgeAt]}
          testID={`globe-pin-done-${story.id}`}
        >
          <Feather name="check" size={10} color={colors.textOnBrand} />
        </Animated.View>
      )}
      {progress === 'inProgress' && (
        <View style={[styles.badge, badgeAt]} testID={`globe-pin-progress-${story.id}`}>
          <ProgressPie share={story.progress.done / story.progress.total} />
        </View>
      )}
    </Tappable>
  );
}

const PIE = 14;

/** A filled wedge from 12 o'clock: the share of the path's lessons done. */
function ProgressPie({ share }: { share: number }) {
  const r = PIE / 2;
  const a = 2 * Math.PI * Math.min(share, 0.999);
  const x = r + r * Math.sin(a);
  const y = r - r * Math.cos(a);
  return (
    <Svg width={PIE} height={PIE}>
      <Circle cx={r} cy={r} r={r} fill={colors.brandPrimarySoft} />
      <Path d={`M${r} ${r} L${r} 0 A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y} Z`} fill={colors.brandPrimary} />
    </Svg>
  );
}

const PULSE_W = 44;
const PULSE_H = 14;

const pulse = {
  animationName: {
    from: { opacity: 0.7, transform: [{ scale: 0.6 }] },
    to: { opacity: 0, transform: [{ scale: 1.6 }] },
  },
  animationDuration: 1600,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-out',
} satisfies CSSStyle;

const styles = StyleSheet.create({
  box: { width: PIN_BOX.width, height: PIN_BOX.height },
  head: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: colors.bgSurface,
    transform: [{ rotate: '45deg' }],
    ...elevation.pin,
  },
  icon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  // Yellow glow under the current pin (static when reduce-motion is on).
  pulse: {
    position: 'absolute',
    width: PULSE_W,
    height: PULSE_H,
    left: (PIN_BOX.width - PULSE_W) / 2,
    top: PIN_BOX.height - PULSE_H / 2,
    borderRadius: PULSE_H / 2,
    backgroundColor: colors.brandAccent,
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.bgSurface,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeDone: { backgroundColor: colors.feedbackSuccess },
});
