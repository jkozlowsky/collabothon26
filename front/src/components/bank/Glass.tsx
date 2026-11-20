import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, elevation } from '@/constants/theme';

type Props = { style?: StyleProp<ViewStyle>; children?: ReactNode };

/**
 * Figma "Glass/Nav" surface: blurred backdrop + white 62% + white border.
 * Android blur needs extra native setup, so there it is an opaque surface with the same shadow.
 */
export function Glass({ style, children }: Props) {
  if (Platform.OS === 'android') {
    return <View style={[styles.base, styles.fallback, style]}>{children}</View>;
  }
  return (
    <View style={[styles.base, style]}>
      <BlurView intensity={24} tint="light" style={[StyleSheet.absoluteFill, styles.clip]} />
      <View style={[StyleSheet.absoluteFill, styles.clip, styles.fill]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, borderColor: colors.glassBorder, ...elevation.glass },
  clip: { borderRadius: 999, overflow: 'hidden' },
  fill: { backgroundColor: colors.glassFill },
  fallback: { backgroundColor: colors.glassFallback },
});
