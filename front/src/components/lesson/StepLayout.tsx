import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RichText } from '@/components/lesson/RichText';
import { colors, spacing, type } from '@/constants/theme';

type Props = {
  kicker?: string;
  prompt?: string;
  children?: ReactNode;
  /** Pinned under the content, in thumb reach: the Continue button or the feedback panel. */
  footer?: ReactNode;
  /** Off for steps that own horizontal gestures (sort cards), so the scroll view can't take the drag. */
  scroll?: boolean;
};

/** One idea per screen: optional overline, prompt, the step's big element, action at the bottom. */
export function StepLayout({ kicker, prompt, children, footer, scroll = true }: Props) {
  const content = (
    <>
      {kicker && <Text style={styles.kicker}>{kicker}</Text>}
      {prompt && <RichText text={prompt} style={styles.prompt} testID="step-prompt" />}
      {children}
    </>
  );
  return (
    <View style={styles.fill}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content}>{content}</ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{content}</View>
      )}
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  kicker: { ...type.overline, color: colors.textMuted },
  prompt: type.titleSection,
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
});
