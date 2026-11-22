import { StyleSheet, Text, View } from 'react-native';

import { HeroSurface } from '@/components/bank/HeroSurface';
import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

// Kept for importers outside the bank (profile, duel) that still read these from here.
export { HeroBackground } from '@/components/bank/HeroBackground';
export { HeroSurface } from '@/components/bank/HeroSurface';

type Stat = { label: string; value: string; tone?: 'positive' | 'default' };

type Props = {
  /** Small line above the amount ("Main account · available"). */
  label: string;
  amount: string;
  /** Line under the amount (masked IBAN, "31 of 48 instalments paid"). */
  caption: string;
  stats: [Stat, Stat];
  hidden: boolean;
  onToggleHidden: () => void;
  testID?: string;
  amountTestID?: string;
};

/** Brings the 18 px eye icon up to a 44 px touch target. */
const EYE_HIT_SLOP = 13;

/** Figma dark hero card: main account (Home) and instalment loan (Credits). */
export function HeroCard({ label, amount, caption, stats, hidden, onToggleHidden, testID, amountTestID }: Props) {
  return (
    <HeroSurface testID={testID}>
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        <Tappable
          onPress={onToggleHidden}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
          testID="toggle-amounts"
          hitSlop={EYE_HIT_SLOP}
          pressedScale={0.9}
        >
          <Icon name={hidden ? 'eye-off' : 'eye'} size={18} color={colors.onBrandMuted} />
        </Tappable>
      </View>
      <Text style={styles.amount} testID={amountTestID}>
        {amount}
      </Text>
      <Text style={styles.caption}>{caption}</Text>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statValue, s.tone === 'positive' && styles.positive]}>{s.value}</Text>
          </View>
        ))}
      </View>
    </HeroSurface>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...type.labelDefault, color: colors.onBrandMuted },
  amount: { ...type.displayAmount, color: colors.textOnBrand, marginTop: spacing.xs },
  caption: { ...type.labelDefault, color: colors.onBrandMuted },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.onBrandTile, borderRadius: radii.button, paddingVertical: spacing.sm, paddingHorizontal: spacing.smPlus, gap: spacing.xxs },
  statLabel: { ...type.labelDefault, color: colors.onBrandMuted },
  statValue: { ...type.labelStrong, color: colors.textOnBrand },
  // Light green on petrol: the Figma "In this month" value.
  positive: { color: colors.globeLand },
});
