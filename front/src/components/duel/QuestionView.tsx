import Feather from '@expo/vector-icons/Feather';
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

/** Question and feedback view (Figma 157:4008 / 157:4130 / 157:4245). */
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

  const nextLabel = index + 1 >= total ? 'Zobacz wynik' : 'Dalej';

  return (
    <DuelPage
      testID={isFeedback ? 'duel-feedback' : 'duel-question'}
      header={
        <FlowHeader
          onClose={onExit}
          closeLabel="Opuść pojedynek"
          closeTestID="match-close"
          title={`Pytanie ${Math.min(index + 1, total)} z ${total}`}
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
        ) : (
          <View style={styles.footerTip}>
            <Feather name="info" size={14} color={colors.textMuted} />
            <Text style={styles.tipText}>Czas nie wpływa na punkty — liczy się poprawność</Text>
          </View>
        )
      }
    >
      {/* Dark Scoreboard Card */}
      <ScoreboardCard
        youAvatar={youAvatar}
        youName={state.you?.name ?? 'Ty'}
        youLevels={state.you?.levels}
        rival={state.rival}
        currentCategory={currentCategory}
        yourDots={state.yourDots}
        rivalDots={state.rivalDots}
        yourScore={yourScore}
        rivalScore={rivalScore}
        activeIndex={activeIndex}
        questionCount={total}
      />

      {/* Question rendering */}
      {question && (
        <DuelQuestionView
          question={question}
          onSubmit={onSubmitAnswer}
          disabled={isFeedback}
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
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
  feedbackFooter: {
    gap: spacing.md,
  },
  footerTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  tipText: {
    ...type.labelDefault,
    color: colors.textMuted,
  },
});
