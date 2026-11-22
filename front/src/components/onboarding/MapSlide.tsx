import { StyleSheet, Text, View } from 'react-native';

import { LessonGlobeIllustration } from '@/components/onboarding/illustrations/LessonGlobeIllustration';
import { Rise } from '@/components/onboarding/Rise';
import { type as text } from '@/components/onboarding/ui';
import { colors, spacing, type } from '@/constants/theme';

/** Second onboarding slide, on petrol: the globe of lesson pins. */
export function MapSlide() {
  return (
    <>
      <View style={styles.grow} />
      <LessonGlobeIllustration />
      <View style={styles.gap} />
      <Rise delay={300}>
        <Text style={styles.overline}>LEARN · THE MAP</Text>
      </Rise>
      <Rise delay={400}>
        <Text style={styles.title}>Every pin is a field of finance</Text>
      </Rise>
      <View style={styles.grow} />
    </>
  );
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
  gap: { height: spacing.xl },
  overline: { ...type.overline, color: colors.brandAccent, letterSpacing: 3 },
  title: { ...text.display, color: colors.textOnBrand },
});
