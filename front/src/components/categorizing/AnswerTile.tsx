import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HAIRLINE, RULE } from '@/constants/path';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  label: string;
  selected: boolean;
  /** The "Not sure" tile: quieter, no fill. */
  quiet?: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
  /** The confidence chips, which grow inside the tile once it is tapped. */
  children?: ReactNode;
};

const TOUCH_TARGET = 48;
const RADIO = 22;

/** One single-choice tile; the border is an overlay, so selecting it does not move the layout. */
export function AnswerTile({ label, selected, quiet, disabled, onPress, testID, children }: Props) {
  return (
    <View style={[styles.tile, selected && styles.selected, disabled && !selected && styles.disabled]}>
      <Pressable
        testID={testID}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={styles.row}
      >
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected && <Feather name="check" size={14} color={colors.textOnBrand} />}
        </View>
        <Text style={[styles.label, quiet && styles.quiet]}>{label}</Text>
      </Pressable>
      {children}
      <View pointerEvents="none" style={[styles.edge, selected ? styles.edgeSelected : quiet && styles.edgeQuiet]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radii.card, backgroundColor: colors.bgSurface },
  selected: { backgroundColor: colors.brandAccentSoft },
  disabled: { opacity: 0.6 },
  row: { minHeight: TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    borderWidth: RULE,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  label: { ...type.bodyDefault, flex: 1 },
  quiet: { ...type.labelDefault, color: colors.textMuted },
  // borderStrong is 1.5:1 on white; a control's edge needs 3:1 (WCAG 2.2 SC 1.4.11), so textMuted.
  edge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radii.card, borderWidth: HAIRLINE, borderColor: colors.textMuted },
  edgeSelected: { borderWidth: RULE, borderColor: colors.brandPrimary },
  edgeQuiet: { borderStyle: 'dashed' },
});
