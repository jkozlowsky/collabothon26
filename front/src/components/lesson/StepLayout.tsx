import { createContext, useContext, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RichText } from '@/components/lesson/RichText';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { Phase } from '@/types/lessons';

/** The current step's place in the lesson flow, set by StepView, shown as a label over the step. */
export const PhaseContext = createContext<Phase | undefined>(undefined);

export const PHASE_LABEL: Record<Phase, string> = {
  learn: 'Learn',
  challenge: 'Challenge',
  you: 'Your situation',
  decide: 'Decide',
};

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
  const phase = useContext(PhaseContext);
  const content = (
    <>
      {phase && (
        <Text style={[styles.phase, phase === 'you' && styles.phaseYou]} testID={`phase-${phase}`}>
          {PHASE_LABEL[phase]}
        </Text>
      )}
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
  phase: {
    ...type.overline,
    alignSelf: 'flex-start',
    color: colors.brandPrimary,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  phaseYou: { color: colors.textOnBrand, backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  prompt: type.titleSection,
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
});
