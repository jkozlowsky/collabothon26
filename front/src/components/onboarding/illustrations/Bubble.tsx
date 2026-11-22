import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, elevation, illustrationShadow, type } from '@/constants/theme';

type Props = {
  /** light and dark sit on the petrol welcome hero; success is the "Right" bubble of the quick check. */
  tone: 'light' | 'dark' | 'success';
  icon: ReactNode;
  text: string;
};

/** A small floating chip of an illustration: an icon and a short caption. */
export function Bubble({ tone, icon, text }: Props) {
  return (
    <View style={[styles.bubble, styles[tone]]}>
      {icon}
      <Text style={tone === 'light' ? styles.textDark : styles.textLight}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  light: { backgroundColor: colors.bgSurface, ...illustrationShadow.bubble },
  dark: { backgroundColor: colors.onBrandChip, borderWidth: 1, borderColor: colors.onBrandHairline },
  success: { backgroundColor: colors.feedbackSuccess, ...elevation.mid },
  textDark: { ...type.labelStrong, color: colors.textPrimary },
  textLight: { ...type.labelStrong, color: colors.textOnBrand },
});
