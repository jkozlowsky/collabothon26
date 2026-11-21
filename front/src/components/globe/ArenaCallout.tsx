import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { CALLOUT_WIDTH } from '@/components/globe/PinCallout';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

type Props = {
  onOpen: () => void;
};

export function ArenaCallout({ onOpen }: Props) {
  return (
    <View style={styles.card} testID="pin-callout-arena">
      <Text style={styles.overline}>Arena</Text>
      <Text style={styles.title}>Zmierz się z innymi</Text>
      <Text style={styles.meta}>Pojedynki finansowe</Text>
      <Tappable
        onPress={onOpen}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Graj w arenie"
        testID="pin-callout-arena-open"
        containerStyle={styles.buttonWrap}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>Graj</Text>
        <Feather name="arrow-right" size={16} color={colors.textOnAccent} />
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CALLOUT_WIDTH,
    padding: spacing.md,
    gap: spacing.xxs,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    ...elevation.mid,
  },
  overline: { ...type.overline, color: colors.brandPrimary },
  title: type.titleCard,
  meta: { ...type.labelDefault, color: colors.textMuted },
  buttonWrap: { alignSelf: 'flex-start', marginTop: spacing.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingLeft: 14,
    paddingRight: spacing.md,
    borderRadius: radii.button,
    backgroundColor: colors.brandAccent,
  },
  buttonLabel: { ...type.labelStrong, color: colors.textOnAccent },
});
