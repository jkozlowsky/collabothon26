import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  children?: ReactNode;
  /** Wrap content in a ScrollView (for long lists / lesson content). */
  scroll?: boolean;
  testID?: string;
};

export function Screen({ title, children, scroll = false, testID }: Props) {
  const content = (
    <>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </>
  );

  return (
    // Tab bar handles the bottom inset, so only pad the top (notch / status bar).
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content}>{content}</ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    ...type.displayLarge,
    marginBottom: spacing.lg,
  },
});
