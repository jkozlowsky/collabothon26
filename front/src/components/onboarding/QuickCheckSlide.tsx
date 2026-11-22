import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { QuickCheckHero } from '@/components/onboarding/illustrations/QuickCheckHero';
import { type } from '@/components/onboarding/ui';
import { colors, spacing } from '@/constants/theme';

/** Last onboarding slide: what the quick check is and how long it takes. */
export function QuickCheckSlide() {
  return (
    <>
      <View style={styles.grow} />
      <QuickCheckHero />
      <View style={styles.gap} />
      <Text style={type.overline}>QUICK CHECK · 3–6 QUESTIONS</Text>
      <Text style={type.display} accessibilityRole="header">
        Let&apos;s see what you already know
      </Text>
      <View style={styles.meta}>
        <Feather name="clock" size={14} color={colors.textMuted} />
        <Text style={type.label}>About 2 minutes</Text>
      </View>
      <View style={styles.growDouble} />
    </>
  );
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
  growDouble: { flexGrow: 2 },
  gap: { height: spacing.xxxl },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2 },
});
