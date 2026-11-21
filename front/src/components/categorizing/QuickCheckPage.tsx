import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnswerTile } from '@/components/categorizing/AnswerTile';
import { ConfidenceChips } from '@/components/categorizing/ConfidenceChips';
import { FlowPage } from '@/components/categorizing/FlowPage';
import { GLYPH, HAIRLINE, RULE } from '@/constants/path';
import { STATUS_TEXT } from '@/constants/quickCheck';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { QuestionView } from '@/hooks/useQuickCheck';
import type { Confidence } from '@/types/quickCheck';

const TOUCH_TARGET = 44;
const ICON = 20;
const NOT_SURE = -1;

type Props = {
  /** Null while the first step runs: only the header and the status line show. */
  view: QuestionView | null;
  /** The shown question's number, and how many there can be at most. */
  position: number;
  total: number;
  /** A step is running or the test is done: tiles and chips are off. */
  status: 'waiting' | 'done' | null;
  /** Tiles wait a moment after a question appears, so a double tap cannot skip one. */
  ready: boolean;
  /** The dock, for knowledge questions. */
  dock?: ReactNode;
  /** `optionIndex` null = "Not sure". */
  onAnswer: (optionIndex: number | null, confidence: Confidence | null) => void;
  onBack: () => void;
};

// react-native-web takes tabIndex on Text so focus() works; RN's TextProps do not declare it.
const WEB_FOCUSABLE = { tabIndex: -1 };

export function QuickCheckPage({ view, position, total, status, ready, dock, onAnswer, onBack }: Props) {
  const filled = status ? position : position - 1;
  const profile = view?.kind === 'profile';

  return (
    <FlowPage testID="quick-check" footer={dock}>
      <View style={styles.top}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.back}
          testID="quick-check-back"
        >
          <Feather name="chevron-left" size={ICON} color={colors.brandPrimary} />
        </Pressable>
      </View>
      <View style={styles.row}>
        <Text style={type.labelStrong} testID="quick-check-position">
          Question {position} of up to {total}
        </Text>
        {view && <Text style={styles.muted}>{profile ? 'Not scored' : 'Not a test you can fail'}</Text>}
      </View>
      <View
        style={styles.segments}
        accessible
        accessibilityLabel={`Question ${position} of up to ${total}. The check may end earlier.`}
      >
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < filled ? styles.done : i === filled && styles.current]} />
        ))}
      </View>
      {/* Keyed per question, so the selection and the focus start fresh while the header and the dock stay. */}
      {view && <Question key={view.key} view={view} position={position} total={total} off={!ready} onAnswer={onAnswer} />}
      {status && (
        <Text style={styles.status} testID="quick-check-status">
          {STATUS_TEXT[status]}
        </Text>
      )}
    </FlowPage>
  );
}

type QuestionProps = Pick<Props, 'onAnswer'> & { view: QuestionView; position: number; total: number; off: boolean };

function Question({ view, position, total, off, onAnswer }: QuestionProps) {
  const [selected, setSelected] = useState<number | null>(
    view.kind === 'profile' && view.preselectedOptionIndex !== undefined ? view.preselectedOptionIndex : null,
  );
  const promptRef = useRef<ComponentRef<typeof Text>>(null);
  const profile = view.kind === 'profile';

  // A new question moves focus to its prompt (WCAG 2.2 SC 2.4.3); the screen's live region announces the status.
  useEffect(() => {
    const prompt = promptRef.current;
    if (!prompt) return;
    if (Platform.OS === 'web') (prompt as unknown as HTMLElement).focus();
    else AccessibilityInfo.setAccessibilityFocus(findNodeHandle(prompt) ?? 0);
  }, []);

  const pick = (index: number | null) => {
    setSelected(index ?? NOT_SURE);
    if (profile || index === null) onAnswer(index, null);
  };

  return (
    <>
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
      <View style={styles.why} testID="quick-check-why">
        <Feather name={profile ? 'user' : 'search'} size={14} color={colors.brandPrimary} />
        <Text style={styles.whyText}>Why this question: {view.why}</Text>
      </View>
      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={view.prompt}>
        {view.options.map((label, i) => (
          <AnswerTile
            key={label}
            label={label}
            selected={selected === i}
            disabled={off}
            onPress={() => pick(i)}
            testID={`quick-check-option-${i}`}
          >
            {selected === i && !profile && <ConfidenceChips disabled={off} onPick={(c) => onAnswer(i, c)} />}
          </AnswerTile>
        ))}
        {!profile && (
          <AnswerTile
            label="Not sure"
            quiet
            selected={selected === NOT_SURE}
            disabled={off}
            onPress={() => pick(null)}
            testID="quick-check-unsure"
          />
        )}
      </View>
      <Slip view={view} />
    </>
  );
}

function Slip({ view }: { view: QuestionView }) {
  if (view.account) {
    return (
      <View style={styles.slip}>
        <Feather name="lock" size={GLYPH} color={colors.brandPrimary} />
        <Text style={styles.slipText}>Only your answer is sent, never these numbers.</Text>
      </View>
    );
  }
  return <Text style={styles.muted}>{view.kind === 'profile' ? 'A fact about you, not a test.' : 'Example numbers'}</Text>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center' },
  back: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    marginLeft: -(TOUCH_TARGET - ICON) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  muted: { ...type.labelDefault, color: colors.textMuted },
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 8, borderRadius: spacing.xs, borderWidth: RULE, borderStyle: 'dashed', borderColor: colors.borderStrong },
  done: { borderStyle: 'solid', borderColor: colors.brandPrimary, backgroundColor: colors.brandPrimary },
  current: { borderStyle: 'solid', borderColor: colors.brandPrimary, backgroundColor: colors.brandAccent },
  prompt: { ...type.titleSection, marginTop: spacing.xs },
  filled: { color: colors.brandPrimary, backgroundColor: colors.brandPrimarySoft },
  why: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.sm - 2,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.smPlus,
    borderRadius: radii.pill,
    backgroundColor: colors.brandPrimarySoft,
  },
  whyText: { ...type.labelDefault, color: colors.brandPrimary, flexShrink: 1 },
  options: { gap: spacing.sm },
  slip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    borderWidth: HAIRLINE,
    borderColor: colors.borderDefault,
  },
  slipText: { ...type.labelStrong, color: colors.brandPrimary, flexShrink: 1 },
  status: { ...type.titleCard, color: colors.brandPrimary },
});
