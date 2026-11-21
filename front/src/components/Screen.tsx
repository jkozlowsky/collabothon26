import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, nav, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  children?: ReactNode;
  /** Wrap content in a ScrollView (for long lists / lesson content). */
  scroll?: boolean;
  /** Shown on the right of the title row (e.g. a small action or stat chips). */
  headerRight?: ReactNode;
  testID?: string;
};

export function Screen({ title, children, scroll = false, headerRight, testID }: Props) {
  const content = (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {headerRight}
      </View>
      {children}
    </>
  );

  return (
    // The floating nav handles the bottom inset; content gets bottom padding to clear it.
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
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
    paddingTop: spacing.lg,
    paddingBottom: nav.clearance + spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...type.displayLarge,
    flexShrink: 1,
  },
});
