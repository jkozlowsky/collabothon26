import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/components/onboarding/ui';
import type { IconName } from '@/constants/onboarding';
import { GLYPH } from '@/constants/path';
import type { Feedback, FeedbackTone } from '@/constants/quickCheck';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = { feedback: Feedback };

const TONE: Record<FeedbackTone, { icon: IconName; color: string; fill: string }> = {
  right: { icon: 'check', color: colors.feedbackSuccess, fill: colors.feedbackSuccessSoft },
  wrong: { icon: 'x', color: colors.feedbackDanger, fill: colors.feedbackDangerSoft },
  unsure: { icon: 'info', color: colors.brandPrimary, fill: colors.brandPrimarySoft },
};

/** What the answer showed, under the tiles: fades in with the reveal. */
export function FeedbackBanner({ feedback }: Props) {
  const reduced = useReducedMotion();
  const { icon, color, fill } = TONE[feedback.tone];
  return (
    <Animated.View
      testID="quick-check-feedback"
      style={[styles.banner, { backgroundColor: fill }, reduced ? motion.fade : motion.swap]}
    >
      <Feather name={icon} size={GLYPH} color={color} />
      <View style={styles.text}>
        <Text style={[type.labelStrong, { color }]}>{feedback.title}</Text>
        <Text style={type.bodyDefault}>{feedback.body}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: spacing.smPlus, padding: spacing.mdPlus, borderRadius: radii.card },
  text: { flex: 1, gap: spacing.xxs },
});
