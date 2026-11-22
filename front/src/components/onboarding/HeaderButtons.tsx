import Feather from '@expo/vector-icons/Feather';
import { StyleSheet } from 'react-native';

import { Tappable } from '@/components/onboarding/ui';
import type { IconName } from '@/constants/onboarding';
import { colors } from '@/constants/theme';

type Props = { onPress: () => void; onDark?: boolean };

type RoundButtonProps = Props & { testID: string; label: string; icon: IconName; iconSize: number };

const SIZE = 36;

function RoundButton({ testID, label, icon, iconSize, onPress, onDark }: RoundButtonProps) {
  return (
    <Tappable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      pressedScale={0.9}
      style={[styles.button, onDark && styles.onDark]}
    >
      <Feather name={icon} size={iconSize} color={onDark ? colors.textOnBrand : colors.brandPrimary} />
    </Tappable>
  );
}

export function BackButton(props: Props) {
  return <RoundButton {...props} testID="onboarding-back" label="Back" icon="chevron-left" iconSize={20} />;
}

/** Leaves onboarding without saving anything: back to where the user came from. */
export function CloseButton(props: Props) {
  return <RoundButton {...props} testID="onboarding-close" label="Close" icon="x" iconSize={18} />;
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onDark: { backgroundColor: colors.onBrandTile, borderColor: colors.onBrandTile },
});
