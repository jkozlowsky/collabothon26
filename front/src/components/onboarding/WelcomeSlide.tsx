import { StyleSheet, Text, View } from 'react-native';

import { AtlasHero } from '@/components/onboarding/illustrations/AtlasHero';
import { Rise } from '@/components/onboarding/Rise';
import { colors, spacing, type } from '@/constants/theme';

/** First onboarding slide, on petrol: the Atlas hero over the wordmark and the motto. */
export function WelcomeSlide() {
  return (
    <>
      <View style={styles.grow} />
      <AtlasHero />
      <View style={styles.gap} />
      <Rise delay={250}>
        <Text style={styles.overline}>WELCOME TO</Text>
      </Rise>
      <Rise delay={350}>
        <Text style={styles.wordmark} accessibilityRole="header">
          Atlas<Text style={styles.wordmarkDot}>.</Text>
        </Text>
      </Rise>
      <Rise delay={420}>
        <Text style={styles.motto} testID="atlas-motto">
          Atlas lets your financial decisions land safely.
        </Text>
      </Rise>
      <View style={styles.grow} />
    </>
  );
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
  gap: { height: spacing.xl },
  overline: { ...type.overline, color: colors.brandAccent, letterSpacing: 3 },
  wordmark: { ...type.displayHero, color: colors.textOnBrand },
  wordmarkDot: { color: colors.brandAccent },
  motto: { ...type.titleSection, color: colors.brandAccent, marginTop: -spacing.xs },
});
