import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { BankIconName } from '@/types/bank';

type Props = {
  icon: BankIconName;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

/** One of the three lobby modes (vs human, vs bot, solo). Selected = yellow fill + petrol border. */
export function ModeCard({ icon, title, subtitle, selected, onPress, testID }: Props) {
  return (
    <Tappable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      haptic="selection"
      onPress={onPress}
      containerStyle={styles.container}
      style={[styles.card, selected && styles.cardSelected, motion.colors]}
    >
      <View style={[styles.tile, selected && styles.tileSelected]}>
        <Icon name={icon} size={18} color={colors.brandPrimary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  cardSelected: { backgroundColor: colors.brandAccentSoft, borderColor: colors.brandPrimary },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radii.button,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  tileSelected: { backgroundColor: colors.brandAccent },
  title: type.titleCard,
  subtitle: { ...type.labelDefault, color: colors.textMuted },
});
