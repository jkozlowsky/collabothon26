import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

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

/** Petrol gradient with two faint circles, like the cards in Figma. The parent clips it to its radius. */
export function HeroBackground() {
  // Unique per instance: on web a duplicated gradient id can resolve to a copy inside a hidden tab and paint nothing.
  const id = `hero-${useId().replace(/:/g, '')}`;
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.heroGradientFrom} />
          <Stop offset="1" stopColor={colors.brandPrimary} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      <Circle cx="88%" cy="12%" r="90" fill={colors.textOnBrand} opacity={0.05} />
      <Circle cx="96%" cy="105%" r="64" fill={colors.textOnBrand} opacity={0.05} />
    </Svg>
  );
}

/** Figma dark hero card: main account (Home) and instalment loan (Credits). */
export function HeroCard({ label, amount, caption, stats, hidden, onToggleHidden, testID, amountTestID }: Props) {
  return (
    <View style={styles.card} testID={testID}>
      <HeroBackground />
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        <Tappable
          onPress={onToggleHidden}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
          testID="toggle-amounts"
          hitSlop={10}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, padding: spacing.lg, overflow: 'hidden', ...elevation.high },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...type.labelDefault, color: colors.onBrandMuted },
  amount: { ...type.displayAmount, color: colors.textOnBrand, marginTop: spacing.xs },
  caption: { ...type.labelDefault, color: colors.onBrandMuted },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.onBrandTile, borderRadius: radii.button, paddingVertical: spacing.sm, paddingHorizontal: 10, gap: 2 },
  statLabel: { ...type.labelDefault, color: colors.onBrandMuted },
  statValue: { ...type.labelStrong, color: colors.textOnBrand },
  // Light green on petrol: the Figma "In this month" value.
  positive: { color: colors.globeLand },
});
