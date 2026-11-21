import { StyleSheet, Text, View } from 'react-native';

import { ColosseumIcon } from '@/components/globe/ColosseumIcon';
import { PIN_BOX } from '@/components/globe/GlobePin';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, type } from '@/constants/theme';

type Props = {
  active?: boolean;
  onPress: () => void;
};

export function ArenaPin({ active = false, onPress }: Props) {
  const size = active ? 44 : 36;
  const headTop = PIN_BOX.height - size * Math.SQRT1_2 - size / 2;
  const head = { width: size, height: size, left: (PIN_BOX.width - size) / 2, top: headTop };

  return (
    <Tappable
      onPress={onPress}
      haptic="selection"
      pressedScale={0.9}
      accessibilityRole="button"
      accessibilityLabel="Arena, Challenge others"
      testID="globe-pin-arena"
      style={styles.box}
    >
      <View
        style={[
          styles.head,
          head,
          {
            borderTopLeftRadius: size / 2,
            borderTopRightRadius: size / 2,
            borderBottomLeftRadius: size / 2,
            backgroundColor: colors.brandPrimary,
            borderColor: active ? colors.brandAccent : colors.bgSurface,
          },
        ]}
      />
      <View style={[styles.icon, head]}>
        <ColosseumIcon size={active ? 20 : 16} color={colors.textOnBrand} />
      </View>
      <View style={[styles.chip, { top: headTop - 8 }]}>
        <Text style={styles.chipText}>Arena</Text>
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  box: { width: PIN_BOX.width, height: PIN_BOX.height },
  head: {
    position: 'absolute',
    borderWidth: 3,
    transform: [{ rotate: '45deg' }],
    ...elevation.pin,
  },
  icon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...elevation.low,
  },
  chipText: {
    ...type.labelTab,
    fontSize: 9,
    lineHeight: 12,
    color: colors.textOnBrand,
    fontWeight: '700',
  },
});
