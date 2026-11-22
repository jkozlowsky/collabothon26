import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { BankProduct } from '@/lib/bank/products';

type Props = { product: BankProduct; onPress: () => void };

/** A product the user can open or apply for: icon, title, one line of terms and the action button. */
export function ProductRow({ product, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.cta}: ${product.title}`}
      testID={`product-${product.id}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Icon name={product.icon} size={18} color={colors.brandPrimary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {product.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {product.meta}
        </Text>
      </View>
      <View style={styles.button}>
        <Text style={styles.buttonLabel}>{product.cta}</Text>
      </View>
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
  button: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.brandPrimary,
  },
  buttonLabel: { ...type.labelStrong, color: colors.textOnBrand },
});
