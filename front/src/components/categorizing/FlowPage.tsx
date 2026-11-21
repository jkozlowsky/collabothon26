import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeIn } from '@/components/onboarding/ui';
import { colors, spacing, type } from '@/constants/theme';

type Props = {
  testID: string;
  /** Centre the content vertically (status screens); the consent card sits at the top. */
  center?: boolean;
  footer?: ReactNode;
  /** Small print under the footer buttons. */
  note?: string;
  children: ReactNode;
};

/** The categorisation flow's page, laid out like the onboarding pages: scrolling body, buttons in a footer. */
export function FlowPage({ testID, center, footer, note, children }: Props) {
  return (
    <SafeAreaView style={styles.page} testID={testID}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  content: { flexGrow: 1, gap: spacing.smPlus },
  center: { justifyContent: 'center' },
  note: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm },
});
