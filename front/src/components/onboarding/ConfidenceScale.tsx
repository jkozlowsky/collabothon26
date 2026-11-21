import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { motion, Tappable, type } from '@/components/onboarding/ui';
import { GLYPH, RULE } from '@/constants/path';
import { CONFIDENCE_CAPTION } from '@/constants/quickCheck';
import * as theme from '@/constants/theme';
import { colors, radii, spacing } from '@/constants/theme';
import type { ConfidenceRating } from '@/types/quickCheck';

type Props = {
  /** The question the scale answers, read out as the group's name. */
  label: string;
  value: ConfidenceRating | null;
  onChange: (value: ConfidenceRating) => void;
};

const RATINGS: ConfidenceRating[] = [1, 2, 3, 4, 5];
const TILE = 48;

/** Five tiles from "Not at all" to "Very confident", the picked number in words, and why the app asks. */
export function ConfidenceScale({ label, value, onChange }: Props) {
  const reduced = useReducedMotion();
  return (
    <>
      <View style={styles.card} accessibilityRole="radiogroup" accessibilityLabel={label}>
        <View style={styles.tiles}>
          {RATINGS.map((n) => (
            <Tappable
              key={n}
              testID={`confidence-${n}`}
              accessibilityRole="radio"
              accessibilityLabel={`${n}, ${CONFIDENCE_CAPTION[n]}`}
              aria-checked={value === n}
              onPress={() => onChange(n)}
              haptic="selection"
              pressedScale={0.95}
              containerStyle={styles.slot}
              style={[styles.tile, value === n && styles.tileOn, motion.colors]}
            >
              <Text style={styles.number}>{n}</Text>
            </Tappable>
          ))}
        </View>
        <View style={styles.anchors} aria-hidden>
          <Text style={type.label}>Not at all</Text>
          <Text style={type.label}>Very confident</Text>
        </View>
      </View>
      {/* Keyed by the number, so each pick fades its words in. */}
      <Animated.View key={value} style={value !== null && (reduced ? motion.fade : motion.swap)}>
        <Text style={styles.caption} testID="confidence-caption">
          {value === null ? 'Pick a number' : `${value} — “${CONFIDENCE_CAPTION[value]}”`}
        </Text>
      </Animated.View>
      <View style={styles.note}>
        <Feather name="trending-up" size={GLYPH} color={colors.brandPrimary} />
        <View style={styles.noteText}>
          <Text style={type.strong}>Why we ask</Text>
          <Text style={theme.type.bodyDefault}>
            We compare this with your answers in the quick check, so your path starts at the right level.
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.smPlus,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  slot: { flex: 1 },
  tile: {
    height: TILE,
    borderRadius: radii.tile,
    borderWidth: RULE,
    borderColor: colors.bgTint,
    backgroundColor: colors.bgTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOn: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary },
  number: { ...theme.type.titleCard, color: colors.brandPrimary },
  anchors: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { ...theme.type.labelStrong, textAlign: 'center', marginVertical: spacing.xs },
  note: {
    flexDirection: 'row',
    gap: spacing.smPlus,
    padding: spacing.mdPlus,
    borderRadius: radii.card,
    backgroundColor: colors.brandAccentSoft,
  },
  noteText: { flex: 1, gap: spacing.xxs },
});
