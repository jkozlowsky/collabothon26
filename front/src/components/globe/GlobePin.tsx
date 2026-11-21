import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion, type CSSStyle } from 'react-native-reanimated';

import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, storyColors } from '@/constants/theme';
import { storyLabel, type StoryState } from '@/lib/stories';
import type { Story } from '@/types/stories';

type Props = {
  story: Story;
  state: StoryState;
  onPress: () => void;
};

/** The pin's touch box. Its bottom-centre is the pin tip, which the globe places on the city. */
export const PIN_BOX = { width: 60, height: 64 } as const;

/** Figma "Globe Pin": a teardrop in the story colour; the current one is larger and yellow, with a pulse. */
export function GlobePin({ story, state, onPress }: Props) {
  const reduced = useReducedMotion();
  const active = state === 'active';
  const locked = state === 'comingSoon';
  const size = active ? 44 : 36;
  // A square turned 45° with one sharp corner reads as a pin; that corner is the tip.
  const headTop = PIN_BOX.height - size * Math.SQRT1_2 - size / 2;
  const head = { width: size, height: size, left: (PIN_BOX.width - size) / 2, top: headTop };
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
      <View
        style={[
          styles.head,
          head,
          // Three round corners and one sharp one, which becomes the tip once turned. Set one by one:
          // react-native-web lets a `borderRadius` shorthand win over a longhand.
          { borderTopLeftRadius: size / 2, borderTopRightRadius: size / 2, borderBottomLeftRadius: size / 2, backgroundColor: fill },
        ]}
      />
      <View style={[styles.icon, head]}>
        <Feather name={locked ? 'lock' : story.icon} size={active ? 20 : 16} color={active ? colors.textOnAccent : colors.textOnBrand} />
      </View>
      {state === 'done' && (
        <View style={[styles.badge, { left: head.left + size - 10, top: headTop - 6 }]}>
          <Feather name="check" size={10} color={colors.textOnBrand} />
        </View>
      )}
    </Tappable>
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
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
