import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopWash } from '@/components/duel/TopWash';
import { colors, spacing } from '@/constants/theme';

type Props = {
  /** Fixed above the scroll (close button, counter, progress). */
  header?: ReactNode;
  /** Fixed under the scroll (the screen's main button). */
  footer?: ReactNode;
  children: ReactNode;
  /** Centre the content vertically (error and empty states). */
  centered?: boolean;
  testID?: string;
};

/** Light full-screen duel page (no nav): wash, fixed header and footer, scrolling body. 20 px sides like the bank pages. */
export function DuelPage({ header, footer, children, centered = false, testID }: Props) {
  return (
    <SafeAreaView style={styles.safe} testID={testID}>
      <StatusBar style="dark" />
      <TopWash />
      {header}
      <ScrollView contentContainerStyle={[styles.content, centered && styles.centered]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCanvas },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.lg },
  centered: { flexGrow: 1, justifyContent: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm },
});
