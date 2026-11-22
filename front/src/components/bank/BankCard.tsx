import { StyleSheet, Text, View } from 'react-native';

import { CommerzbankLogo } from '@/components/bank/CommerzbankLogo';
import { HeroBackground } from '@/components/bank/HeroBackground';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { PaymentCard } from '@/types/bank';

type Props = { card: PaymentCard; onPress: () => void; width: number };

/** A payment card in the Home "Cards" carousel. `dark` = petrol debit card, `accent` = yellow credit card. */
export function BankCard({ card, onPress, width }: Props) {
  const dark = card.variant === 'dark';
  const ink = dark ? colors.textOnBrand : colors.textOnAccent;
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${card.brand} ${card.kind} card ending ${card.last4}`}
      testID={`card-${card.id}`}
      pressedScale={0.98}
      style={[styles.card, { width }, !dark && styles.accent]}
    >
      {dark && <HeroBackground />}
      <View style={styles.top}>
        {/* On the yellow card the yellow emblem would vanish, so it sits on a petrol tile there. */}
        <View style={!dark && styles.logoTile}>
          <CommerzbankLogo height={dark ? 26 : 20} />
        </View>
        <Text style={[styles.kind, { color: ink }]}>{card.kind}</Text>
      </View>
      <View style={[styles.chip, !dark && styles.chipOnAccent]} />
      <Text style={[styles.number, { color: ink }]}>•••• •••• •••• {card.last4}</Text>
      <View style={styles.bottom}>
        <Text style={[styles.holder, { color: ink }]}>{card.holder}</Text>
        <Text style={[styles.holder, { color: ink }]}>{card.expiry}</Text>
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: { height: 184, borderRadius: radii.card, padding: 18, overflow: 'hidden', justifyContent: 'space-between', ...elevation.mid },
  accent: { backgroundColor: colors.brandAccent },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoTile: { backgroundColor: colors.brandPrimary, borderRadius: 8, padding: spacing.xs },
  kind: type.overline,
  chip: { width: 36, height: 26, borderRadius: 6, backgroundColor: colors.cardChipGold },
  chipOnAccent: { backgroundColor: colors.cardChipOnAccent },
  number: { ...type.titleCard, letterSpacing: 1.5 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.xs },
  holder: type.labelStrong,
});
