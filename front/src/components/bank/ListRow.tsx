import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { BankIconName } from '@/types/bank';

type Props = {
  icon: BankIconName;
  title: string;
  /** A string, or custom content (e.g. a level label with a progress bar). */
  meta?: ReactNode;
  value?: string;
  /** Second line under the value ("remaining", "Next: 1 Dec"). */
  valueNote?: string;
  tone?: 'default' | 'positive' | 'negative';
  /** Value colour; wins over `tone` and adds `muted` (e.g. a value that is still calibrating). */
  valueTone?: 'default' | 'positive' | 'negative' | 'muted';
  /** Colour only the note (e.g. a holding's % change). */
  noteTone?: 'default' | 'positive' | 'negative';
  /** Own tile colours, e.g. a category tint; defaults to the petrol tile. */
  tile?: { background: string; color: string };
  /** Show a chevron after the value for rows that open something. */
  chevron?: boolean;
  onPress?: () => void;
  testID?: string;
};

const TONE = { default: colors.textPrimary, muted: colors.textMuted, positive: colors.feedbackSuccess, negative: colors.feedbackDanger } as const;
const NOTE_TONE = { default: colors.textMuted, positive: colors.feedbackSuccess, negative: colors.feedbackDanger } as const;

/** One line of a bank list: icon tile, title + meta, amount + note. */
export function ListRow({ icon, title, meta, value, valueNote, tone = 'default', valueTone, noteTone = 'default', tile, chevron, onPress, testID }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.tile, tile && { backgroundColor: tile.background }]}>
        <Icon name={icon} size={18} color={tile?.color ?? colors.brandPrimary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {typeof meta === 'string' ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : (
          meta
        )}
      </View>
      {value !== undefined && (
        <View style={styles.right}>
          <Text style={[styles.value, { color: TONE[valueTone ?? tone] }]} numberOfLines={1}>
            {value}
          </Text>
          {valueNote && <Text style={[styles.note, { color: NOTE_TONE[noteTone] }]}>{valueNote}</Text>}
        </View>
      )}
      {chevron && <Icon name="chevron-right" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.smPlus, minHeight: 60 },
  pressed: { backgroundColor: colors.bgCanvas },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radii.button,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xxs },
  title: type.titleCard,
  meta: { ...type.labelDefault, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: spacing.xxs, flexShrink: 0 },
  value: type.titleCard,
  note: { ...type.labelDefault, color: colors.textMuted },
});
