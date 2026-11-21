import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { depotTotal, monthlyInvesting } from '@/lib/bank/selectors';

type Props = { intro?: string; accent: string; tint: string };

/** The path's promise and the user's own numbers it works with, from the mock bank. */
export function YourMoneyCard({ intro, accent, tint }: Props) {
  const { state, money } = useBank();
  const monthly = monthlyInvesting(state);
  const figures = [
    { label: 'Savings', value: money(state.savings.balance, { whole: true }) },
    { label: 'Invested', value: money(depotTotal(state), { whole: true }) },
    { label: 'Monthly plan', value: monthly ? money(monthly, { whole: true }) : '—' },
  ];
  return (
    <View style={styles.card} testID="your-money">
      {intro && <Text style={styles.intro}>{intro}</Text>}
      <View style={[styles.figures, { backgroundColor: tint }]}>
        {figures.map((f) => (
          <View key={f.label} style={styles.figure}>
            <Text style={[styles.value, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
              {f.value}
            </Text>
            <Text style={styles.label}>{f.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.note}>
        <Icon name="lock" size={12} color={colors.textMuted} />
        <Text style={styles.label}>Lessons use your numbers on this device only</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, backgroundColor: colors.bgSurface, borderRadius: radii.card, padding: spacing.lg, ...elevation.mid },
  intro: type.bodyReading,
  figures: { flexDirection: 'row', borderRadius: radii.tile, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  figure: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  value: type.titleCard,
  label: { ...type.labelDefault, color: colors.textMuted },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
