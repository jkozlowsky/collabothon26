import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef, type ComponentRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnswerTile, type AnswerState } from '@/components/categorizing/AnswerTile';
import { FeedbackBanner } from '@/components/categorizing/FeedbackBanner';
import { Page } from '@/components/onboarding/Page';
import { BigButton, CloseButton, FadeIn, haptic, StepHeader, type as text } from '@/components/onboarding/ui';
import { GLYPH } from '@/constants/path';
import { AREA_LABEL, STATUS_TEXT } from '@/constants/quickCheck';
import { colors, spacing, type } from '@/constants/theme';
import type { QuestionView } from '@/hooks/useQuickCheck';

type Props = {
  /** Null while a step decides or the test is done: the status line shows in its place. */
  view: QuestionView | null;
  /** The shown question's number, and how many there can be at most. */
  position: number;
  total: number;
  status: 'waiting' | 'done' | null;
  /** `optionIndex` null = "Not sure". */
  onAnswer: (optionIndex: number | null) => void;
  onContinue: () => void;
  onClose: () => void;
};

// react-native-web takes tabIndex on Text so focus() works; RN's TextProps do not declare it.
const WEB_FOCUSABLE = { tabIndex: -1 };

export function QuickCheckPage({ view, position, total, status, onAnswer, onContinue, onClose }: Props) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // The feedback lands under the tiles, which a long question pushes below the fold.
  const answer = (optionIndex: number | null) => {
    onAnswer(optionIndex);
    requestAnimationFrame(() => scroll.current?.scrollToEnd());
  };
  const next = () => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    onContinue();
  };
  return (
    <Page
      testID="quick-check"
      scrollRef={scroll}
      header={
        <StepHeader
          left={<CloseButton onPress={onClose} />}
          label={`Question ${position} of up to ${total}`}
          progress={position / total}
        />
      }
      footer={<BigButton label="Continue" onPress={next} disabled={!view?.result} testID="quick-check-continue" />}
    >
      {/* Keyed per question, so the focus and the entrance start fresh while the header stays. */}
      {view && (
        <FadeIn key={view.key} style={styles.question}>
          <Question view={view} position={position} total={total} onAnswer={answer} />
        </FadeIn>
      )}
      {status && (
        <Text style={styles.status} testID="quick-check-status">
          {STATUS_TEXT[status]}
        </Text>
      )}
    </Page>
  );
}

type QuestionProps = Pick<Props, 'onAnswer' | 'position' | 'total'> & { view: QuestionView };

function Question({ view, position, total, onAnswer }: QuestionProps) {
  const promptRef = useRef<ComponentRef<typeof Text>>(null);
  const { result, correctIndex } = view;

  // A new question moves focus to its prompt (WCAG 2.2 SC 2.4.3); the screen's live region announces the rest.
  useEffect(() => {
    const prompt = promptRef.current;
    if (!prompt) return;
    if (Platform.OS === 'web') (prompt as unknown as HTMLElement).focus();
    else AccessibilityInfo.setAccessibilityFocus(findNodeHandle(prompt) ?? 0);
  }, []);

  const pick = (index: number | null) => {
    if (index === correctIndex) haptic('success');
    onAnswer(index);
  };
  const stateOf = (index: number): AnswerState => {
    if (!result) return 'default';
    if (index === correctIndex) return 'correct';
    return index === result.picked ? 'wrong' : 'dimmed';
  };

  return (
    <>
      <Text style={text.overline}>QUICK CHECK · {AREA_LABEL[view.area].toUpperCase()}</Text>
      <Text
        ref={promptRef}
        accessibilityLabel={`Question ${position} of up to ${total}. ${view.prompt}`}
        {...WEB_FOCUSABLE}
        style={styles.prompt}
        accessibilityRole="header"
        testID="quick-check-prompt"
      >
        {view.parts.map((p, i) => (
          <Text key={i} style={p.filled && styles.filled}>
            {p.text}
          </Text>
        ))}
      </Text>
      <Text style={text.label} testID="quick-check-why">
        Why this question: {view.why}
      </Text>
      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={view.prompt}>
        {view.options.map((label, i) => (
          <AnswerTile
            key={label}
            title={label}
            state={stateOf(i)}
            checked={result?.picked === i}
            disabled={!!result}
            onPress={() => pick(i)}
            testID={`quick-check-option-${i}`}
          />
        ))}
        <AnswerTile
          title="Not sure"
          subtitle="That is fine. Your lessons cover it."
          state={!result ? 'default' : result.picked === null ? 'selected' : 'dimmed'}
          checked={result?.picked === null}
          disabled={!!result}
          onPress={() => pick(null)}
          testID="quick-check-unsure"
        />
      </View>
      {result && <FeedbackBanner feedback={result.feedback} />}
      {view.account ? (
        <View style={styles.slip}>
          <Feather name="lock" size={GLYPH} color={colors.textMuted} />
          <Text style={[text.label, styles.slipText]}>Only your answer is sent, never these numbers.</Text>
        </View>
      ) : (
        <Text style={text.label}>Example numbers</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  question: { gap: spacing.smPlus },
  prompt: { ...type.titleSection },
  filled: { color: colors.brandPrimary, backgroundColor: colors.brandPrimarySoft },
  options: { gap: spacing.smPlus, marginTop: spacing.sm },
  slip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slipText: { flexShrink: 1 },
  status: { ...type.titleCard, color: colors.brandPrimary },
});
