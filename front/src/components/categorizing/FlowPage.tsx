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
  /** Read out politely by screen readers when it changes (the current loading step). */
  status?: string;
  /** Read out at once by screen readers when it appears (an error). */
  alert?: string;
  children: ReactNode;
};

/** The categorisation flow's page, laid out like the onboarding pages: scrolling body, buttons in a footer. */
export function FlowPage({ testID, center, footer, note, status, alert, children }: Props) {
  return (
    <SafeAreaView style={styles.page} testID={testID}>
      {/* Every screen of the flow renders FlowPage at its root, so these regions stay mounted and announce changes. */}
      <Text style={styles.offscreen} aria-live="polite" testID="flow-status">
        {status}
      </Text>
      <Text style={styles.offscreen} aria-live="assertive" testID="flow-alert">
        {alert}
      </Text>
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
  offscreen: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  content: { flexGrow: 1, gap: spacing.smPlus },
  center: { justifyContent: 'center' },
  note: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm },
});
