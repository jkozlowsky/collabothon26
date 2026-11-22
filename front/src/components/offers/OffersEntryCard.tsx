import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  /** All stops done: the offers can be opened. */
  ready: boolean;
  onOpen: () => void;
};

/** The story's last stop: from what you learned to what the bank offers in this area. */
export function OffersEntryCard({ title, ready, onOpen }: Props) {
  return (
    <View style={[styles.card, !ready && styles.locked]} testID="offers-entry">
      <View style={styles.head}>
        <View style={styles.tile}>
          <Icon name={ready ? 'briefcase' : 'lock'} size={22} color={colors.brandPrimary} />
        </View>
        <View style={styles.text}>
          <Text style={styles.overline}>End of the line · Next step</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{ready ? 'What you learned, and a first step you can take in your bank.' : 'Finish every stop to see the next step.'}</Text>
        </View>
      </View>
      {ready && <Button label="Take the first step" onPress={onOpen} testID="offers-entry-open" />}
    </View>
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
  locked: { opacity: 0.6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: { width: 44, height: 44, borderRadius: radii.tile, backgroundColor: colors.brandPrimarySoft, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing.xxs },
  overline: { ...type.overline, color: colors.brandPrimary },
  title: type.titleCard,
  meta: { ...type.labelDefault, color: colors.textMuted },
});
