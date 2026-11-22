import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DuelPage } from '@/components/duel/DuelPage';
import { FeedbackBanner } from '@/components/duel/FeedbackBanner';
import { FlowHeader } from '@/components/duel/FlowHeader';
import { ScoreboardCard } from '@/components/duel/ScoreboardCard';
import { DuelQuestionView } from '@/components/duel/questions/DuelQuestionView';
import { colors, radii, spacing, type } from '@/constants/theme';
import { formatClock } from '@/lib/duel/meta';
import { getRivalScore, getYourScore, type DuelMatchState } from '@/lib/duel/reducer';
import type { AvatarId } from '@/types/account';
import type { DuelAnswer } from '@/types/duel';

type Props = {
  state: DuelMatchState;
  youAvatar: AvatarId;
  secondsLeft: number;
  onSubmitAnswer: (answer: DuelAnswer) => void;
  onNextQuestion: () => void;
  onExit: () => void;
};

/** Question and feedback view (Figma 157:4008 / 157:4130 / 157:4245 / v3 166:4997, 166:5181, 166:5311). */
export function QuestionView({
  state,
  youAvatar,
  secondsLeft,
  onSubmitAnswer,
  onNextQuestion,
  onExit,
}: Props) {
  const { question, feedback } = state;
  const isFeedback = state.phase === 'feedback' && feedback !== null;
  const yourScore = getYourScore(state);
  const rivalScore = getRivalScore(state);
  const index = question?.index ?? feedback?.index ?? 0;
  const total = state.questionCount;
  const activeIndex = isFeedback ? null : index;
  const currentCategory = question?.category ?? state.categories[0] ?? 'berlin';

  const step = question?.step;
  const stepType = step?.type;

  // Initial draft answer: sliders start at min and are active immediately
  const getInitialDraftAnswer = (s: typeof step): DuelAnswer | null => {
    if (!s) return null;
    if (s.type === 'predict' || s.type === 'chart') {
      return { value: s.input.min };
    }
    return null;
  };

  const [prevQuestionIndex, setPrevQuestionIndex] = useState(question?.index);
  const [draftAnswer, setDraftAnswer] = useState<DuelAnswer | null>(() => getInitialDraftAnswer(step));

  // Reset draftAnswer when question index transitions during render
  if (question?.index !== prevQuestionIndex) {
    setPrevQuestionIndex(question?.index);
    setDraftAnswer(getInitialDraftAnswer(step));
  }

  const handleFooterSubmit = () => {
    if (draftAnswer !== null && !isFeedback) {
      onSubmitAnswer(draftAnswer);
    }
  };

  const nextLabel = index + 1 >= total ? 'See results' : 'Next';

  const submitTestID =
    stepType === 'predict'
      ? 'duel-predict-submit'
      : stepType === 'chart'
        ? 'duel-chart-submit'
        : stepType === 'sort'
          ? 'duel-sort-submit'
          : stepType === 'match'
            ? 'duel-match-submit'
            : 'duel-submit';

  const hintText =
    draftAnswer === null && !isFeedback
      ? stepType === 'sort'
        ? 'Sort every card to submit'
        : stepType === 'match'
          ? 'Match every pair to submit'
          : null
      : null;

  return (
    <DuelPage
      testID={isFeedback ? 'duel-feedback' : 'duel-question'}
      header={
        <FlowHeader
          onClose={onExit}
          closeLabel="Leave duel"
          closeTestID="match-close"
          title={`Question ${Math.min(index + 1, total)} of ${total}`}
          titleTestID="question-counter"
          progress={(index + (isFeedback ? 1 : 0)) / Math.max(1, total)}
          right={
            <View style={styles.timerPill} testID="question-timer">
              <Feather name="clock" size={14} color={colors.textOnAccent} />
              <Text style={styles.timerText}>{formatClock(secondsLeft)}</Text>
            </View>
          }
        />
      }
      footer={
        isFeedback && feedback ? (
          <View style={styles.feedbackFooter}>
            <FeedbackBanner
              outcome={feedback.correct ? 'correct' : feedback.timedOut ? 'timeout' : 'wrong'}
              xpGained={feedback.xpGained}
            />
            <Button label={nextLabel} onPress={onNextQuestion} testID="duel-next-question" />
          </View>
        ) : stepType === 'quiz' ? (
          <View style={styles.footerTip}>
            <Feather name="info" size={14} color={colors.textMuted} />
            <Text style={styles.tipText}>Time doesn&apos;t affect points — accuracy counts</Text>
          </View>
        ) : (
          <View style={styles.questionFooter}>
            <View style={styles.footerTip}>
              <Feather name="info" size={14} color={colors.textMuted} />
              <Text style={styles.tipText}>Time doesn&apos;t affect points — accuracy counts</Text>
            </View>
            <Button
              label="Submit"
              variant="primary"
              disabled={draftAnswer === null || isFeedback}
              onPress={handleFooterSubmit}
              testID={submitTestID}
            />
            {hintText && (
              <Text style={styles.hintText}>{hintText}</Text>
            )}
          </View>
        )
      }
    >
      {/* Dark Scoreboard Card */}
      <ScoreboardCard
        youAvatar={youAvatar}
        youName={state.you?.name ?? 'You'}
        youLevels={state.you?.levels}
        rival={state.rival}
        currentCategory={currentCategory}
        yourDots={state.yourDots}
        rivalDots={state.rivalDots}
        yourScore={yourScore}
        rivalScore={rivalScore}
        activeIndex={activeIndex}
        questionCount={total}
        live={state.live}
        rivalLeft={state.rivalLeft}
      />

      {/* Question rendering */}
      {question && (
        <DuelQuestionView
          key={question.index}
          question={question}
          onSubmit={onSubmitAnswer}
          onAnswerChange={setDraftAnswer}
          disabled={isFeedback}
          hideSubmitButton={stepType !== 'quiz'}
        />
      )}
    </DuelPage>
  );
}

const styles = StyleSheet.create({
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
  timerText: {
    ...type.labelTab,
    color: colors.textOnAccent,
    fontWeight: '700',
  },
  feedbackFooter: {
    gap: spacing.md,
  },
  questionFooter: {
    gap: spacing.sm,
  },
  footerTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  tipText: {
    ...type.labelTab,
    color: colors.textMuted,
  },
  hintText: {
    ...type.labelTab,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
});
