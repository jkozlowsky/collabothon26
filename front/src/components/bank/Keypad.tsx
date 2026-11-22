import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, type } from '@/constants/theme';

type Props = { value: string; onChange: (next: string) => void };

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const;
type Key = (typeof KEYS)[number];

/** Spoken names of the keys that are not a digit. */
const KEY_LABEL: Partial<Record<Key, string>> = { back: 'Delete', '.': 'Decimal point' };

/** Applies one key to the typed amount: one decimal point, at most 2 decimals, max 7 whole digits. */
export function pressKey(value: string, key: Key): string {
  if (key === 'back') return value.slice(0, -1);
  if (key === '.') return value.includes('.') ? value : `${value || '0'}.`;
  const [whole, dec] = value.split('.');
  if (dec !== undefined && dec.length >= 2) return value;
  if (dec === undefined && whole.length >= 7) return value;
  if (value === '0') return key;
  return value + key;
}

/** On-screen number pad for amounts; avoids the system keyboard covering the sheet. */
export function Keypad({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {KEYS.map((k) => (
        <Tappable
          key={k}
          onPress={() => onChange(pressKey(value, k))}
          accessibilityRole="button"
          accessibilityLabel={KEY_LABEL[k] ?? k}
          testID={`key-${k === '.' ? 'dot' : k}`}
          haptic="selection"
          pressedScale={0.94}
          containerStyle={styles.cell}
          style={styles.key}
        >
          {k === 'back' ? <Icon name="delete" size={20} color={colors.brandPrimary} /> : <Text style={styles.text}>{k}</Text>}
        </Tappable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  cell: { width: '33.333%', paddingHorizontal: 3 },
  key: { height: 48, borderRadius: radii.button, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCanvas },
  text: { ...type.titleSection, color: colors.brandPrimary },
});
