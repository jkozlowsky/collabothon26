import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { FlowPage } from '@/components/categorizing/FlowPage';
import { QuestionTrack } from '@/components/categorizing/QuestionTrack';
import { GLYPH, HAIRLINE, RULE } from '@/constants/path';
import { colors, radii, spacing, type } from '@/constants/theme';

const MAX_LENGTH = 280;
const TOUCH_TARGET = 44;
const ICON = 20;
const MIN_INPUT_HEIGHT = 132;
const NUMBER_WORD: Record<number, string> = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six' };

type Props = {
  index: number;
  total: number;
  /** The prompt in pieces; `filled` ones come from the user's account. */
  parts: { text: string; filled: boolean }[];
  /** The question quotes the account, so the slip line says the numbers stay on the phone. */
  account: boolean;
  /** Next and "Not sure" wait a moment after a question appears. */
  ready: boolean;
  value: string;
  onChange: (text: string) => void;
  onNext: (text: string) => void;
  onUnsure: () => void;
  onBack: () => void;
};

export function QuickCheckPage({
  index,
  total,
  parts,
  account,
  ready,
  value,
  onChange,
  onNext,
  onUnsure,
  onBack,
}: Props) {
  const [focused, setFocused] = useState(false);
  const prompt = parts.map((p) => p.text).join('');
  const promptRef = useRef<ComponentRef<typeof Text>>(null);
  // A new question moves focus to its prompt (WCAG 2.2 SC 2.4.3); the screen's live region announces the position.
  useEffect(() => {
    const prompt = promptRef.current;
    if (!prompt) return;
    if (Platform.OS === 'web') (prompt as unknown as HTMLElement).focus();
    else AccessibilityInfo.setAccessibilityFocus(findNodeHandle(prompt) ?? 0);
  }, [index]);

  return (
    <FlowPage
      testID="quick-check"
      footer={
        <>
          <Button
            label="Next"
            onPress={() => onNext(value.trim())}
            disabled={!ready || !value.trim()}
            testID="quick-check-next"
          />
          <Button label="Not sure" variant="ghost" onPress={onUnsure} disabled={!ready} testID="quick-check-unsure" />
        </>
      }
    >
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
        <Text style={type.labelStrong}>
          {index + 1} of {total}
        </Text>
      </View>
      <QuestionTrack current={index} total={total} />
      {index === 0 && (
        <>
          <Text style={styles.muted}>
            {NUMBER_WORD[total] ?? total} quick questions so we know where to start. There are no wrong answers.
          </Text>
          <Text style={styles.muted}>
            Your answers are checked by an AI service to pick your first lesson; only the result is kept.
          </Text>
        </>
      )}
      <Text
        ref={promptRef}
        accessibilityLabel={`Question ${index + 1} of ${total}. ${prompt}`}
        tabIndex={-1}
        style={styles.prompt}
        accessibilityRole="header"
        testID="quick-check-prompt"
      >
        {parts.map((p, i) => (
          <Text key={i} style={p.filled && styles.filled}>
            {p.text}
          </Text>
        ))}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        maxLength={MAX_LENGTH}
        placeholder="A sentence or two is enough"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={prompt}
        autoComplete="off"
        importantForAutofill="no"
        autoCorrect={false}
        style={[styles.input, focused && styles.inputFocused]}
        testID="quick-check-input"
      />
      <View style={styles.meta}>
        <Text style={styles.hint}>No need to type exact amounts</Text>
        <Text style={styles.hint}>
          {value.length} / {MAX_LENGTH}
        </Text>
      </View>
      {account && (
        <View style={styles.slip}>
          <Feather name="lock" size={GLYPH} color={colors.brandPrimary} />
          <Text style={styles.slipText}>Only your answer is sent, never these numbers.</Text>
        </View>
      )}
    </FlowPage>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    marginLeft: -(TOUCH_TARGET - ICON) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: { ...type.bodyDefault, color: colors.textMuted },
  prompt: { ...type.titleSection, marginTop: spacing.xs },
  filled: { color: colors.brandPrimary, backgroundColor: colors.brandPrimarySoft },
  input: {
    ...type.bodyDefault,
    minHeight: MIN_INPUT_HEIGHT,
    textAlignVertical: 'top',
    padding: spacing.mdPlus,
    borderRadius: radii.card,
    borderWidth: HAIRLINE,
    // borderStrong is 1.5:1 on white; a control's edge needs 3:1 (WCAG 2.2 SC 1.4.11).
    borderColor: colors.textMuted,
    backgroundColor: colors.bgSurface,
  },
  inputFocused: {
    borderWidth: RULE,
    borderColor: colors.brandPrimary,
    padding: spacing.mdPlus - (RULE - HAIRLINE),
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  hint: { ...type.labelDefault, color: colors.textMuted },
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
});
