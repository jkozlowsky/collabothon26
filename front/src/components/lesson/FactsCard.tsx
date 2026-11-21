import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/bank/Icon';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { Fact } from '@/types/lessons';

type Props = { facts: Fact[] };

/** "Your situation": the lesson's lens on the user's accounts, as neutral rows. Facts only, never a grade. */
export function FactsCard({ facts }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <View style={styles.card} testID="facts-card">
      <View style={styles.header}>
        <Icon name="eye" size={16} color={colors.textMuted} />
        <Text style={styles.overline}>From your accounts · only on this device</Text>
      </View>
      {facts.map((fact, i) => (
        <Animated.View
          key={fact.label}
          entering={reduceMotion ? undefined : FadeInDown.duration(320).delay(200 + i * 120)}
          style={[styles.row, i > 0 && styles.divider]}
        >
          <View style={styles.labels}>
            <Text style={styles.label}>{fact.label}</Text>
            {fact.note && <Text style={styles.note}>{fact.note}</Text>}
          </View>
          <Text style={styles.value} testID={`fact-${i}`}>
            {fact.value}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgSurface, borderRadius: radii.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...elevation.low },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.sm },
  overline: { ...type.overline, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderDefault },
  labels: { flex: 1, gap: spacing.xxs },
  label: type.titleCard,
  note: { ...type.labelDefault, color: colors.textMuted },
  value: { ...type.titleSection, color: colors.brandPrimary },
});
