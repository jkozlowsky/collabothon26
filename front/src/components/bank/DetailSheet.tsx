import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Sheet } from '@/components/bank/Sheet';
import { Button } from '@/components/Button';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { Detail } from '@/types/bank';

type Props = {
  detail: Detail | null;
  onClose: () => void;
  action?: { label: string; onPress: () => void; testID?: string };
};

const TONE = { default: colors.textPrimary, positive: colors.feedbackSuccess, negative: colors.feedbackDanger } as const;

/** Read-only bottom sheet for a transaction, card, holding, credit product or standing order. */
export function DetailSheet({ detail: next, onClose, action }: Props) {
  // Keep showing the last detail while the sheet slides out after `detail` became null.
  const [detail, setDetail] = useState(next);
  if (next && next !== detail) setDetail(next);
  return (
    <Sheet visible={!!next} onClose={onClose} title={detail?.title} testID="detail-sheet">
      {detail && (
        <>
          <View style={styles.hero}>
            <View style={styles.tile}>
              <Icon name={detail.icon} size={22} color={colors.brandPrimary} />
            </View>
            <Text style={styles.subtitle}>{detail.subtitle}</Text>
            {detail.amount && <Text style={[styles.amount, { color: TONE[detail.amountTone ?? 'default'] }]}>{detail.amount}</Text>}
          </View>
          <View style={styles.rows}>
            {detail.rows.map((r, i) => (
              <View key={r.label} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.value}>{r.value}</Text>
              </View>
            ))}
          </View>
          {detail.note && <Text style={styles.note}>{detail.note}</Text>}
          {action && <Button label={action.label} onPress={action.onPress} testID={action.testID} />}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  tile: {
    width: 48,
    height: 48,
    borderRadius: radii.tile,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: { ...type.labelDefault, color: colors.textMuted },
  amount: type.displayAmount,
  rows: { borderRadius: radii.card, borderWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderDefault },
  label: { ...type.bodyDefault, color: colors.textMuted },
  value: { ...type.labelStrong, flexShrink: 1, textAlign: 'right' },
  note: { ...type.bodyDefault, color: colors.textMuted, backgroundColor: colors.bgCanvas, padding: spacing.md, borderRadius: radii.button },
});
