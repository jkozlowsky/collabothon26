import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, fonts, radii, spacing, type } from '@/constants/theme';
import { useLessonLookup, type LessonPlace } from '@/hooks/useLessonLookup';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import { partitionReview } from '@/lib/duel/reducer';
import type { ReviewItem } from '@/types/duel';

type Props = {
  review: ReviewItem[];
};

/** Expand and collapse take 250 ms ease-out (Figma frame 13). */
const EXPAND_MS = 250;

/** Lesson ids are `<story>-<n>` ("berlin-3"); `category` is a duel area, not a story, so the story comes from the lesson. */
export function storyOfLesson(lessonId: string): string {
  return lessonId.replace(/-\d+$/, '');
}

function formatAnswerTexts(item: ReviewItem): { yourText: string; rightText: string } {
  const step = item.step;
  const yourAnswer = item.yourAnswer;

  if (step.type === 'quiz') {
    const yourText =
      yourAnswer && 'option' in yourAnswer && yourAnswer.option >= 0 && yourAnswer.option < step.options.length
        ? step.options[yourAnswer.option]
        : 'No answer';
    return { yourText, rightText: step.options[step.correctIndex] ?? 'Correct answer' };
  }
  if (step.type === 'predict' || step.type === 'chart') {
    const unit = step.input?.unit ?? ('output' in step ? step.output?.unit : '') ?? '';
    const yourText = yourAnswer && 'value' in yourAnswer ? `${yourAnswer.value} ${unit}`.trim() : 'No answer';
    return { yourText, rightText: `${step.answer} ${unit}`.trim() };
  }
  if (step.type === 'sort') {
    return { yourText: yourAnswer && 'buckets' in yourAnswer ? 'Cards placed' : 'No answer', rightText: 'All placed correctly' };
  }
  if (step.type === 'match') {
    return { yourText: yourAnswer && 'pairs' in yourAnswer ? 'Pairs matched' : 'No answer', rightText: 'All matched correctly' };
  }
  return { yourText: '—', rightText: '—' };
}

/** "Questions 1, 2, 3, 5 and 6". */
function questionList(items: ReviewItem[]): string {
  const numbers = items.map((i) => i.index + 1);
  if (numbers.length === 1) return `Question ${numbers[0]}`;
  return `Questions ${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
}

/** Button label by lesson status: a lesson never taken is not a "repeat" (frame 13 notes). */
export function lessonLabel(title: string, place: LessonPlace | null): string {
  if (place?.status === 'done') return `Repeat lesson: ${title}`;
  if (place?.status === 'available') return `Start lesson: ${title}`;
  return `Go to lesson: ${title}`;
}

function placeLine(place: LessonPlace): string {
  const where = `${place.city} · stop ${place.stop} of ${place.stops}`;
  if (place.status === 'locked') return `${where} · not unlocked yet`;
  return `${where} · ${place.status === 'done' ? 'done' : 'ready to start'}`;
}

function Pill({ tone, text, lines }: { tone: 'wrong' | 'right'; text: string; lines: number }) {
  const wrong = tone === 'wrong';
  const color = wrong ? colors.feedbackDanger : colors.feedbackSuccess;
  return (
    <View style={[styles.pill, { backgroundColor: wrong ? colors.feedbackDangerTint : colors.feedbackSuccessTint }]} testID={wrong ? 'review-your-answer' : 'review-right-answer'}>
      <Feather name={wrong ? 'x' : 'check'} size={12} color={color} />
      <Text style={[styles.pillText, { color }]} numberOfLines={lines}>
        {text}
      </Text>
    </View>
  );
}

type CardProps = {
  item: ReviewItem;
  place: LessonPlace | null;
  testID?: string;
};

/** Review Card (Figma 166:9324): collapsed shows question and answers; the whole card expands for the explanation and lesson button. */
function ReviewItemCard({ item, place, testID }: CardProps) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(0);
  const turn = useSharedValue(0);
  const duration = reduced ? 0 : EXPAND_MS;

  // The extra content stays mounted until the collapse has finished.
  useEffect(() => {
    height.value = withTiming(expanded ? contentHeight : 0, { duration, easing: Easing.out(Easing.cubic) });
    turn.value = withTiming(expanded ? 1 : 0, { duration, easing: Easing.out(Easing.cubic) });
    if (expanded) return;
    const timer = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [expanded, contentHeight, duration, height, turn]);

  const bodyStyle = useAnimatedStyle(() => ({ height: height.value, opacity: contentHeight > 0 ? 1 : 0 }));
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));

  const catMeta = getStoryCategoryMeta(item.category);
  const { yourText, rightText } = formatAnswerTexts(item);
  const explanation = 'explanation' in item.step ? item.step.explanation : null;
  const prompt = 'prompt' in item.step ? item.step.prompt : '';
  const lines = expanded ? 4 : 1;

  function goToLesson() {
    router.push({ pathname: '/story/[id]', params: { id: storyOfLesson(item.lessonId), lesson: item.lessonId } });
  }

  return (
    <Tappable
      onPress={() => {
        if (!expanded) setMounted(true);
        setExpanded((open) => !open);
      }}
      // No button role: the lesson button inside would nest a <button> in a <button> on web.
      aria-expanded={expanded}
      accessibilityLabel={`Question ${item.index + 1}, ${expanded ? 'collapse' : 'expand'}`}
      testID={testID ?? (item.correct ? `review-correct-${item.index}` : `review-mistake-${item.index}`)}
      style={styles.card}
      pressedScale={0.99}
    >
      <View style={styles.head}>
        <View style={[styles.status, { backgroundColor: item.correct ? colors.feedbackSuccess : colors.feedbackDanger }]} />
        <Text style={styles.overline} numberOfLines={1}>
          Question {item.index + 1} · {catMeta.name}
        </Text>
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={18} color={colors.textPrimary} />
        </Animated.View>
      </View>
      <Text style={styles.question}>{prompt}</Text>
      <View style={styles.answers}>
        {item.correct ? (
          <View style={styles.answerCell}>
            <Pill tone="right" text={rightText} lines={lines} />
          </View>
        ) : (
          <>
            <View style={styles.answerCell}>
              <Pill tone="wrong" text={yourText} lines={lines} />
            </View>
            <Feather name="arrow-right" size={14} color={colors.textMuted} />
            <View style={styles.answerCell}>
              <Pill tone="right" text={rightText} lines={lines} />
            </View>
          </>
        )}
      </View>
      {(expanded || mounted) && (
        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.bodyInner} onLayout={(e) => setContentHeight(Math.ceil(e.nativeEvent.layout.height))}>
            <View style={styles.divider} />
            {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}
            {!item.correct && (
              <Tappable
                onPress={goToLesson}
                accessibilityRole="button"
                accessibilityLabel={lessonLabel(item.lessonTitle, place)}
                testID={`review-repeat-lesson-${item.index}`}
                containerStyle={styles.lessonWrap}
                style={styles.lessonButton}
                pressedScale={0.98}
              >
                <Text style={styles.lessonText} numberOfLines={1}>
                  {lessonLabel(item.lessonTitle, place)}
                </Text>
                <Feather name="arrow-right" size={16} color={colors.textOnAccent} />
              </Tappable>
            )}
            {!item.correct && place && (
              <View style={styles.placeRow} testID={`review-lesson-place-${item.index}`}>
                <Icon name={place.status === 'locked' ? 'lock' : 'target'} size={14} color={colors.textMuted} />
                <Text style={styles.placeText}>{placeLine(place)}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </Tappable>
  );
}

type GroupProps = {
  tone: 'correct' | 'wrong';
  title: string;
  items: ReviewItem[];
  place: (item: ReviewItem) => LessonPlace | null;
  testID: string;
};

/** Review Group (Figma v4·5): a collapsed row; a tap opens its cards with a 250 ms height animation and a half-turn chevron. */
function ReviewGroup({ tone, title, items, place, testID }: GroupProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settled, setSettled] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(0);
  const turn = useSharedValue(0);
  const duration = reduced ? 0 : EXPAND_MS;
  const correct = tone === 'correct';

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    turn.value = withTiming(open ? 1 : 0, { duration, easing });
    if (open) {
      if (contentHeight === 0) return;
      height.value = withTiming(contentHeight, { duration, easing });
      // Once open the height is left to the cards, which expand on their own.
      const timer = setTimeout(() => setSettled(true), duration);
      return () => clearTimeout(timer);
    }
    height.value = contentHeight;
    height.value = withTiming(0, { duration, easing });
    const timer = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [open, contentHeight, duration, height, turn]);

  const bodyStyle = useAnimatedStyle(() => (settled ? {} : { height: height.value, opacity: contentHeight > 0 ? 1 : 0 }));
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));

  return (
    <View style={styles.group}>
      <Tappable
        onPress={() => {
          if (!open) setMounted(true);
          else setSettled(false);
          setOpen((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        accessibilityLabel={title}
        testID={testID}
        style={styles.groupRow}
        pressedScale={0.99}
      >
        <View style={[styles.groupDot, { backgroundColor: correct ? colors.feedbackSuccess : colors.feedbackDanger }]} />
        <View style={styles.groupText}>
          <Text style={styles.groupTitle}>{title}</Text>
          <Text style={styles.groupMeta}>
            {questionList(items)} · tap to {open ? 'collapse' : 'expand'}
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={20} color={colors.textMuted} />
        </Animated.View>
      </Tappable>
      {(open || mounted) && (
        <Animated.View style={[styles.groupBody, bodyStyle]}>
          <View
            style={[styles.groupInner, settled && styles.groupInnerSettled]}
            onLayout={(e) => setContentHeight(Math.ceil(e.nativeEvent.layout.height))}
          >
            {items.map((item) => (
              <ReviewItemCard key={item.index} item={item} place={place(item)} />
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/** The review section of the result screen: "Wrong answers (n)" and "Correct answers (n)", both collapsed; empty groups are hidden. */
export function ReviewCard({ review }: Props) {
  const lookup = useLessonLookup();
  const { wrong, correct } = partitionReview(review);
  const place = (item: ReviewItem) => lookup(storyOfLesson(item.lessonId), item.lessonId);

  return (
    <View style={styles.container} testID="result-review">
      <Text style={styles.sectionTitle} accessibilityRole="header" testID="review-title">
        Your answers
      </Text>
      {wrong.length > 0 && <ReviewGroup tone="wrong" title={`Wrong answers (${wrong.length})`} items={wrong} place={place} testID="toggle-wrong-review" />}
      {correct.length > 0 && <ReviewGroup tone="correct" title={`Correct answers (${correct.length})`} items={correct} place={place} testID="toggle-correct-review" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  sectionTitle: { ...type.titleSection, color: colors.textPrimary },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.mdPlus,
    paddingHorizontal: spacing.lg,
    gap: spacing.smPlus,
    overflow: 'hidden',
    ...elevation.low,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 18 },
  status: { width: 10, height: 10, borderRadius: radii.pill },
  overline: { ...type.labelStrong, color: colors.textMuted, flex: 1 },
  question: { ...type.titleCard, color: colors.textPrimary },
  answers: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  answerCell: { flex: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: 8 },
  pillText: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 16, flex: 1 },
  body: { overflow: 'hidden' },
  bodyInner: { position: 'absolute', top: 0, left: 0, right: 0, gap: spacing.smPlus },
  divider: { height: 1, backgroundColor: colors.borderDefault },
  explanation: { ...type.bodyDefault, color: colors.textPrimary },
  lessonWrap: { alignSelf: 'flex-start', maxWidth: '100%' },
  lessonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.brandAccent,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.mdPlus,
    paddingRight: spacing.md,
    minHeight: 44,
  },
  lessonText: { ...type.labelStrong, color: colors.textOnAccent, flexShrink: 1 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  placeText: { ...type.labelDefault, color: colors.textMuted },
  group: { gap: 0 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smPlus,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.mdPlus,
    paddingLeft: spacing.lg,
    paddingRight: spacing.mdPlus,
    ...elevation.low,
  },
  groupDot: { width: 24, height: 24, borderRadius: radii.pill },
  groupText: { flex: 1, gap: 2 },
  groupTitle: { ...type.titleCard, color: colors.textPrimary },
  groupMeta: { ...type.labelDefault, color: colors.textMuted },
  groupBody: { overflow: 'hidden' },
  groupInner: { position: 'absolute', top: 0, left: 0, right: 0, gap: spacing.md, paddingTop: spacing.md },
  groupInnerSettled: { position: 'relative' },
});
