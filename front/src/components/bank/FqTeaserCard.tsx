import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { GlobeSphere } from '@/components/onboarding/Globe';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { FqTeaser } from '@/types/bank';

/** `streak`: days in a row, shown after the meta line when above 0. */
type Props = { teaser: FqTeaser; streak?: number; onPress: () => void; testID?: string };

/** The yellow "Atlas" card that sits inside the bank: the way into a lesson that fits this tab. */
export function FqTeaserCard({ teaser, streak = 0, onPress, testID }: Props) {
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Atlas: ${teaser.title}`} testID={testID} pressedScale={0.98} style={styles.card}>
      <View style={styles.globe}>
        <GlobeSphere size={48} />
      </View>
      <View style={styles.body}>
        <Text style={styles.overline}>Atlas</Text>
        <Text style={styles.title} numberOfLines={1}>
          {teaser.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {streak > 0 ? `${teaser.meta} · ${streak}-day streak` : teaser.meta}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(teaser.progress * 100)}%` }]} />
        </View>
      </View>
      <Icon name="chevron-right" size={20} color={colors.brandPrimary} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brandAccentSoft,
    borderColor: colors.brandAccent,
    borderWidth: 1.5,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: 14,
  },
  globe: { width: 48, height: 48 },
  body: { flex: 1, gap: 2 },
  overline: { ...type.overline, color: colors.brandPrimary },
  title: type.titleCard,
  meta: { ...type.labelDefault, color: colors.textMuted },
  track: { width: 150, maxWidth: '100%', height: 5, borderRadius: radii.bar, backgroundColor: colors.borderDefault, marginTop: spacing.xs, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandPrimary },
});
