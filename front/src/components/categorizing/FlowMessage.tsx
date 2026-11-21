import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';

type Props = { title: string; body: string; children?: ReactNode };

/** Title and one line of explanation over the path, for the loading and error states. */
export function FlowMessage({ title, body, children }: Props) {
  return (
    <>
      <Text style={type.displayLarge} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      {children && <View style={styles.below}>{children}</View>}
    </>
  );
}

const styles = StyleSheet.create({
  body: { ...type.bodyDefault, color: colors.textMuted },
  below: { marginTop: spacing.mdPlus },
});
