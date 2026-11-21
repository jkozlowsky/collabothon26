import { StatusBar } from 'expo-status-bar';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeIn, type } from '@/components/onboarding/ui';
import { colors, spacing } from '@/constants/theme';

type Props = {
  /** Also keys the content, so it fades in again when the screen changes. */
  testID: string;
  dark?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  /** Centre the content vertically (status screens). */
  center?: boolean;
  /** Small print under the footer buttons. */
  note?: string;
  /** For a screen that scrolls its own content into view. */
  scrollRef?: RefObject<ComponentRef<typeof ScrollView> | null>;
  children: ReactNode;
};

/** The one page shell of the onboarding, the quick check and the summary: header, scrolling body, buttons in a footer. */
export function Page({ testID, dark, header, footer, center, note, scrollRef, children }: Props) {
  return (
    <SafeAreaView style={[styles.page, dark && styles.dark]} testID={testID}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {header && <View style={styles.header}>{header}</View>}
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.scroll, !header && styles.noHeader]} showsVerticalScrollIndicator={false}>
        <FadeIn key={testID} style={[styles.content, center && styles.center]}>
          {children}
        </FadeIn>
      </ScrollView>
      {footer && (
        <View style={styles.footer}>
          {footer}
          {note && <Text style={styles.note}>{note}</Text>}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgCanvas },
  dark: { backgroundColor: colors.brandPrimary },
  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg },
  noHeader: { paddingTop: spacing.sm },
  content: { flexGrow: 1, gap: spacing.smPlus },
  center: { justifyContent: 'center' },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  note: { ...type.label, textAlign: 'center' },
});
