import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors } from '@/constants/theme';

type Props = {
  /** The animation or transition that reveals the dot. */
  style?: ComponentProps<typeof Animated.View>['style'];
};

const SIZE = 18;

/** Green dot with a white check: a right answer, a won duel. */
export function CheckDot({ style }: Props) {
  return (
    <Animated.View style={[styles.dot, style]}>
      <Feather name="check" size={11} color={colors.textOnBrand} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
