import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HeroBackground } from '@/components/bank/HeroBackground';
import { elevation, radii, spacing } from '@/constants/theme';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string };

/** The petrol hero card shell with free content: bank hero cards and the duel league / result cards. */
export function HeroSurface({ children, style, testID }: Props) {
  return (
    <View style={[styles.card, style]} testID={testID}>
      <HeroBackground />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, padding: spacing.lg, overflow: 'hidden', ...elevation.high },
});
