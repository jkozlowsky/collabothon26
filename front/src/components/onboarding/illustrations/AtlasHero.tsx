import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Bubble } from '@/components/onboarding/illustrations/Bubble';
import { CheckDot } from '@/components/onboarding/illustrations/CheckDot';
import { HeroGlow } from '@/components/onboarding/illustrations/HeroGlow';
import { enter, FLOAT, loop, PULSE } from '@/components/onboarding/illustrations/keyframes';
import { ACTIVE_PIN, PinnedGlobe } from '@/components/onboarding/illustrations/PinnedGlobe';
import { motion } from '@/components/onboarding/ui';
import { colors, illustrationShadow } from '@/constants/theme';

const STAGE = 300;
const GLOBE = 176;
const ORBIT = 262;

const SPIN = { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } };

const BUBBLES = [
  { pos: { top: 18, left: 0 }, tone: 'light', icon: <Feather name="book-open" size={13} color={colors.brandPrimary} />, text: '3 min lesson' },
  { pos: { top: 54, right: 0 }, tone: 'light', icon: <CheckDot />, text: 'Duel won · 4:3' },
  { pos: { bottom: 34, left: 4 }, tone: 'dark', icon: <Ionicons name="flame" size={13} color={colors.feedbackStreak} />, text: '5 day streak' },
  { pos: { bottom: 14, right: 12 }, tone: 'light', icon: <Feather name="zap" size={13} color={colors.feedbackXp} />, text: '+40 XP' },
] as const;

/**
 * Atlas welcome hero: the globe floats inside two orbits while lesson/duel/XP bubbles drift around. Decorative only; nothing here is tappable.
 */
export function AtlasHero() {
  const reduced = useReducedMotion();
  return (
    <View style={styles.stage} accessible={false} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.glow, !reduced && loop(PULSE, 3200)]}>
        <HeroGlow />
      </Animated.View>
      <Animated.View style={[styles.orbitOuter, !reduced && loop(SPIN, 60000, 0, false)]} />
      <View style={styles.orbitTilt} />
      <Animated.View style={[styles.globeSlot, reduced ? motion.fade : enter(100)]}>
        <Animated.View style={!reduced && loop(FLOAT, 3400, 400)}>
          <View style={styles.globeShadow}>
            <PinnedGlobe size={GLOBE} selected={ACTIVE_PIN} />
          </View>
        </Animated.View>
      </Animated.View>
      {BUBBLES.map((b, i) => (
        <Animated.View key={b.text} style={[styles.bubbleSlot, b.pos, reduced ? motion.fade : enter(500 + i * 140)]}>
          <Animated.View style={!reduced && loop(FLOAT, 2200 + i * 260, i * 300)}>
            <Bubble tone={b.tone} icon={b.icon} text={b.text} />
          </Animated.View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignSelf: 'center' },
  glow: { position: 'absolute', inset: -30 },
  orbitOuter: {
    position: 'absolute',
    left: (STAGE - ORBIT) / 2,
    top: (STAGE - ORBIT) / 2,
    width: ORBIT,
    height: ORBIT,
    borderRadius: ORBIT / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.onBrandDashed,
  },
  // A ring seen at an angle: squashed and tilted so the globe reads as 3D.
  orbitTilt: {
    position: 'absolute',
    left: 10,
    top: STAGE / 2 - 50,
    width: STAGE - 20,
    height: 100,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: colors.onBrandHairline,
    transform: [{ rotate: '-16deg' }],
  },
  globeSlot: { position: 'absolute', left: (STAGE - GLOBE) / 2, top: (STAGE - GLOBE) / 2 },
  globeShadow: { borderRadius: GLOBE / 2, ...illustrationShadow.globe },
  bubbleSlot: { position: 'absolute' },
});
