import { StyleSheet } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii } from '@/constants/theme';
import type { BankIconName } from '@/types/bank';

type Props = { icon: BankIconName; label: string; onPress: () => void; testID?: string };

/** Round white header button (search, scan, bell, calendar). */
export function IconButton({ icon, label, onPress, testID }: Props) {
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} pressedScale={0.92} style={styles.button}>
      <Icon name={icon} size={20} color={colors.brandPrimary} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.low,
  },
});
