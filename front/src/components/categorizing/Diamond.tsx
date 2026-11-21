import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { RULE } from '@/constants/path';
import { colors } from '@/constants/theme';

type Props = {
  testID?: string;
  /** Position and its transition; the diamond only draws itself. */
  style?: ComponentProps<typeof Animated.View>['style'];
};

const SIZE = 10;
export const DIAMOND_HALF = SIZE / 2;

/** The hollow marker for "how sure you felt"; the filled bar is what the answers show. */
export function Diamond({ testID, style }: Props) {
  return <Animated.View testID={testID} aria-hidden style={[styles.diamond, style]} />;
}

const styles = StyleSheet.create({
  diamond: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    backgroundColor: colors.bgSurface,
    borderWidth: RULE,
    borderColor: colors.brandPrimary,
    transform: [{ rotate: '45deg' }],
  },
});
