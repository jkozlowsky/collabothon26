import { StyleSheet, Text, View } from 'react-native';

import { DuelIllustration } from '@/components/onboarding/illustrations/DuelIllustration';
import { Rise } from '@/components/onboarding/Rise';
import { type as text } from '@/components/onboarding/ui';
import { colors, spacing } from '@/constants/theme';

/** Third onboarding slide, on petrol: a duel in progress. */
export function DuelSlide() {
  return (
    <>
      <View style={styles.grow} />
      <DuelIllustration />
      <View style={styles.gap} />
      <Rise delay={300}>
        <Text style={styles.overline}>CHALLENGE · DUELS</Text>
      </Rise>
      <Rise delay={400}>
        <Text style={styles.title}>Put what you know to the test</Text>
      </Rise>
      <View style={styles.grow} />
    </>
  );
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
  gap: { height: spacing.xl },
  overline: { ...text.overline, color: colors.brandAccent },
  title: { ...text.display, color: colors.textOnBrand },
});
