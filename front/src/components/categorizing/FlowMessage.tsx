import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/components/onboarding/ui';
import { spacing } from '@/constants/theme';

type Props = { title: string; body: string; children?: ReactNode };

/** Title and one line of explanation over the path, for the loading and error states. */
export function FlowMessage({ title, body, children }: Props) {
  return (
    <>
      <Text style={type.display} accessibilityRole="header">
        {title}
      </Text>
      <Text style={type.body}>{body}</Text>
      {children && <View style={styles.below}>{children}</View>}
    </>
  );
}

const styles = StyleSheet.create({
  below: { marginTop: spacing.mdPlus },
});
