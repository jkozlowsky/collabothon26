import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  text: string;
  isSelected: boolean;
  /** The tile's pair: its 0-based number and colours, or null while unpaired. */
  pair: { index: number; border: string; bg: string } | null;
  isLocked: boolean;
  onPress: () => void;
  testID: string;
  reducedMotion: boolean;
};

const PULSE_SCALE = 1.03;
const PULSE_HALF_MS = 300;

/** One term or definition. A selected tile pulses; a paired one takes its pair's colour and number. */
export function MatchTile({ text, isSelected, pair, isLocked, onPress, testID, reducedMotion }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    if (isSelected) {
      scale.value = withRepeat(
        withSequence(withTiming(PULSE_SCALE, { duration: PULSE_HALF_MS }), withTiming(1, { duration: PULSE_HALF_MS })),
        -1,
        true,
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [isSelected, reducedMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={pair ? `${text}, pair ${pair.index + 1}` : text}
        disabled={isLocked}
        testID={testID}
        style={({ pressed }) => [
          styles.tile,
          isSelected && styles.tileSelected,
          pair && { borderColor: pair.border, backgroundColor: pair.bg },
          pressed && !isLocked && styles.pressed,
        ]}
      >
        <View style={styles.inner}>
          {pair && (
            <View style={[styles.pairBadge, { backgroundColor: pair.border }]}>
              <Text style={styles.pairBadgeText}>{pair.index + 1}</Text>
            </View>
          )}
          <Text style={[styles.text, isSelected && styles.textSelected, pair && styles.textPaired]}>{text}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.bgSurface,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: colors.brandAccent,
    backgroundColor: colors.brandAccentSoft,
    shadowColor: colors.legacyShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    opacity: 0.8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pairBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairBadgeText: {
    ...type.labelDefault,
    color: colors.textOnBrand,
    fontWeight: '800',
    fontSize: 10,
    lineHeight: 12,
  },
  text: {
    ...type.bodyDefault,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  textSelected: {
    fontWeight: '700',
    color: colors.brandPrimary,
  },
  textPaired: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
