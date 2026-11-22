import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion } from '@/components/onboarding/ui';
import { colors, elevation, nav, radii, spacing, type } from '@/constants/theme';

type Props = { message: string };

/** Non-blocking message that floats just above the nav. Rendered by ToastProvider. */
export function Toast({ message }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + nav.clearance }]}>
      <Animated.View style={[styles.toast, motion.swap]} accessibilityLiveRegion="polite" testID="toast">
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.xl },
  toast: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.pill,
    paddingVertical: spacing.smPlus,
    paddingHorizontal: spacing.lg,
    ...elevation.mid,
  },
  text: { ...type.labelStrong, color: colors.textOnBrand },
});
