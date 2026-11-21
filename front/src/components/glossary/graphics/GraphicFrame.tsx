import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, elevation, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  caption: string;
  testID: string;
  children: ReactNode;
};

/** White card shared by all glossary graphics: overline title, the drawing, one caption line. */
export function GraphicFrame({ title, caption, testID, children }: Props) {
  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={`${title}. ${caption}`}>
      <Text style={type.overline}>{title}</Text>
      {children}
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 18,
    gap: spacing.md,
    ...elevation.low,
  },
  caption: { ...type.bodyDefault, color: colors.textMuted },
});
