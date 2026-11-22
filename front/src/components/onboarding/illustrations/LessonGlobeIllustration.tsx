import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { HeroGlow } from '@/components/onboarding/illustrations/HeroGlow';
import { enter, loop, PULSE } from '@/components/onboarding/illustrations/keyframes';
import { ACTIVE_PIN, GLOBE_PINS, PinnedGlobe } from '@/components/onboarding/illustrations/PinnedGlobe';
import { colors, fonts, illustrationShadow, radii } from '@/constants/theme';

const GLOBE_SIZE = 250;

/** The map, on petrol like the welcome hero: a globe of pins with the open pin's lesson card. Illustration only. */
export function LessonGlobeIllustration() {
  const reduced = useReducedMotion();
  const pin = GLOBE_PINS[ACTIVE_PIN];
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.stage}>
        <Animated.View style={[styles.glow, !reduced && loop(PULSE, 3200)]}>
          <HeroGlow />
        </Animated.View>
        <View style={styles.orbit} />
        <View style={styles.shadow} />
        <View style={styles.sphere}>
          <PinnedGlobe size={GLOBE_SIZE} selected={ACTIVE_PIN} />
        </View>
        <Animated.View style={[styles.card, enter(350)]} testID="globe-card">
          <View style={styles.cityRow}>
            <View style={[styles.dot, { backgroundColor: pin.color }]} />
            <Text style={styles.overline}>{pin.city.toUpperCase()}</Text>
          </View>
          <Text style={styles.cardTitle}>{pin.title}</Text>
          <Text style={styles.meta}>{pin.meta}</Text>
          <View style={styles.cardButton}>
            <Text style={styles.cardButtonText}>Continue</Text>
            <Feather name="arrow-right" size={13} color={colors.brandPrimary} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 330, maxWidth: '100%', height: 300, alignSelf: 'center' },
  orbit: {
    position: 'absolute',
    left: 0,
    top: 12,
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.onBrandDashed,
  },
  glow: { position: 'absolute', left: -30, top: -20, width: 350, height: 350 },
  shadow: {
    position: 'absolute',
    left: 88,
    bottom: 4,
    width: 110,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.groundShadow,
  },
  sphere: { position: 'absolute', left: 18, top: 30 },
  card: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 3,
    ...illustrationShadow.cardRaised,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  overline: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.feedbackXp },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  cardButton: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.brandAccent,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cardButtonText: { fontSize: 13, fontWeight: '700', color: colors.brandPrimary },
});
