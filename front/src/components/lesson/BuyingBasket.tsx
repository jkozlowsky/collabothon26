import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type CSSStyle } from 'react-native-reanimated';

import { colors, elevation, radii, spacing, type } from '@/constants/theme';

type Props = {
  /** Change in buying power in %, e.g. −21.8. */
  changePct: number;
  years: number;
};

/** Ten things of €10 each: what €100 buys today. */
const ITEMS: ComponentProps<typeof Feather>['name'][] = [
  'coffee', 'shopping-bag', 'book', 'film', 'music', 'scissors', 'gift', 'umbrella', 'smartphone', 'truck',
];
const ITEM_EUR = 10;

/**
 * "What €100 buys": a basket of ten items that empties as buying power falls. The last item fades in part,
 * so every slider step shows. Inflation as things you lose, not as a percentage.
 */
export function BuyingBasket({ changePct, years }: Props) {
  const worth = Math.max(0, 100 * (1 + changePct / 100));
  const full = worth / ITEM_EUR;
  const lost = changePct < 0;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`€100 today buys after ${years} years what €${Math.round(worth)} buys today`}
      testID="buying-basket"
    >
      <View style={styles.header}>
        <Text style={styles.overline}>What €100 buys</Text>
        <Text style={[styles.worth, lost ? styles.bad : styles.good]} testID="basket-worth">
          €{Math.round(worth)} <Text style={styles.after}>after {years} {years === 1 ? 'year' : 'years'}</Text>
        </Text>
      </View>
      <View style={styles.grid}>
        {ITEMS.map((icon, i) => {
          // 1 = still bought, 0 = gone; the item at the edge is partly there.
          const share = Math.min(1, Math.max(0, full - i));
          return (
            <Animated.View key={icon} style={[styles.item, share < 1 && styles.itemLost, { opacity: 0.25 + 0.75 * share }, FADE]}>
              <Feather name={icon} size={20} color={share > 0 ? colors.brandPrimary : colors.textMuted} />
            </Animated.View>
          );
        })}
      </View>
      {!lost && changePct > 0 && <Text style={[styles.note, styles.good]}>Your interest beats the price rise: the basket grows.</Text>}
    </View>
  );
}

/** Reanimated CSS transition: the items fade as the slider moves. */
const FADE = { transitionProperty: 'opacity', transitionDuration: 250 } satisfies CSSStyle;

const styles = StyleSheet.create({
  card: { gap: spacing.md, backgroundColor: colors.bgSurface, borderRadius: radii.card, padding: spacing.lg, ...elevation.low },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  overline: { ...type.overline, color: colors.textMuted },
  worth: type.titleSection,
  after: { ...type.labelDefault, color: colors.textMuted },
  good: { color: colors.feedbackSuccess },
  bad: { color: colors.feedbackDanger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    width: '17.6%',
    aspectRatio: 1,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandAccentSoft,
    borderWidth: 1.5,
    borderColor: colors.brandAccent,
  },
  itemLost: { backgroundColor: colors.bgCanvas, borderColor: colors.borderStrong, borderStyle: 'dashed' },
  note: type.labelStrong,
});
