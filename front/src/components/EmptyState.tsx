import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { BankIconName } from '@/types/bank';

type Props = {
  icon: BankIconName;
  title: string;
  body?: string;
  /** `danger` for errors (red tile), `default` for empty lists. */
  tone?: 'default' | 'danger';
  /** Buttons under the text. */
  children?: ReactNode;
  testID?: string;
};

/** Centered icon tile, title and one line of help: empty lists and error screens. */
export function EmptyState({ icon, title, body, tone = 'default', children, testID }: Props) {
  const danger = tone === 'danger';
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={[styles.tile, danger && styles.tileDanger]}>
        <Icon name={icon} size={24} color={danger ? colors.feedbackDanger : colors.brandPrimary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  tile: {
    width: 56,
    height: 56,
    borderRadius: radii.card,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  tileDanger: { backgroundColor: colors.feedbackDangerSoft },
  title: { ...type.titleSection, textAlign: 'center' },
  body: { ...type.bodyDefault, color: colors.textMuted, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
});
