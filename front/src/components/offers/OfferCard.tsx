import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { BankOffer } from '@/types/offers';

type Props = { offer: BankOffer; onPress: () => void };

/** One bank product at the end of a story: its terms, the lesson it connects to, and the way to it in the bank. */
export function OfferCard({ offer, onPress }: Props) {
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${offer.title}. Show me in the bank`}
      pressedScale={0.98}
      style={styles.card}
      testID={`offer-${offer.id}`}
    >
      <View style={styles.head}>
        <View style={styles.tile}>
          <Icon name={offer.icon} size={22} color={colors.brandPrimary} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{offer.title}</Text>
          <Text style={styles.meta}>{offer.meta}</Text>
        </View>
      </View>
      <View style={styles.from}>
        <Icon name="book" size={14} color={colors.textMuted} />
        <Text style={styles.fromText}>{offer.from}</Text>
      </View>
      <View style={styles.link}>
        <Text style={styles.linkText}>Show me in the bank</Text>
        <Icon name="arrow-right" size={16} color={colors.brandPrimary} />
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderColor: colors.borderDefault,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: { width: 44, height: 44, borderRadius: radii.tile, backgroundColor: colors.brandPrimarySoft, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: type.titleCard,
  meta: { ...type.labelDefault, color: colors.textMuted },
  from: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fromText: { ...type.labelDefault, color: colors.textMuted, flex: 1 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingTop: spacing.md,
  },
  linkText: { ...type.labelStrong, color: colors.brandPrimary },
});
