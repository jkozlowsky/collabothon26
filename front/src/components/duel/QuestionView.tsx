import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { AnswerOption, type AnswerOptionState } from '@/components/duel/AnswerOption';
import { ConnectionBanner } from '@/components/duel/ConnectionBanner';
import { DotTrack } from '@/components/duel/DotTrack';
import { DuelPage } from '@/components/duel/DuelPage';
import { FeedbackBanner } from '@/components/duel/FeedbackBanner';
import { FlowHeader } from '@/components/duel/FlowHeader';
import { ScoreboardCard } from '@/components/duel/ScoreboardCard';
import { StatusChip } from '@/components/duel/StatusChip';
import { colors, radii, spacing, type } from '@/constants/theme';
import { formatClock, getCategoryMeta } from '@/lib/duel/meta';
import { getRivalScore, getYourScore, type DuelMatchState } from '@/lib/duel/reducer';
import type { AvatarId } from '@/types/account';

type Props = {
  state: DuelMatchState;
  youAvatar: AvatarId;
  secondsLeft: number;
  onSelectOption: (option: number) => void;
  onNextQuestion: () => void;
  onDismissReconnect: () => void;
  onExit: () => void;
};

/** Live question and, after answering, its feedback (Figma "Duel — Question" / "Answer feedback"). */
export function QuestionView({ state, youAvatar, secondsLeft, onSelectOption, onNextQuestion, onDismissReconnect, onExit }: Props) {
  const cat = getCategoryMeta(state.category);
  const { question, feedback } = state;
  const isFeedback = state.phase === 'feedback' && feedback !== null;
  const isSolo = state.mode === 'SOLO' || state.rival === null;
  const yourScore = getYourScore(state);
  const index = question?.index ?? 0;
  const total = state.questionCount;
  const activeIndex = isFeedback ? null : index;

  function optionState(i: number): AnswerOptionState {
    if (isFeedback && feedback) {
      if (!feedback.timedOut && i === feedback.chosenOption) return feedback.correct ? 'correct' : 'wrong';
      return 'dimmed';
    }
    return state.selectedOption === i ? 'pending' : 'default';
  }

  const nextLabel = state.pendingEnd ? 'See results' : index + 1 >= total ? 'Continue' : 'Next question';
  const chosenText = feedback?.chosenOption != null && question ? question.options[feedback.chosenOption] : null;

  return (
    <DuelPage
      testID={isFeedback ? 'duel-feedback' : 'duel-question'}
      header={
        <FlowHeader
          onClose={onExit}
          closeLabel="Leave match"
          closeTestID="match-close"
          title={`Question ${Math.min(index + 1, total)} of ${total}`}
          titleTestID="question-counter"
          progress={(index + (isFeedback ? 1 : 0)) / Math.max(1, total)}
          right={
            <StatusChip
              label={formatClock(secondsLeft)}
              tone={secondsLeft <= 10 ? 'timerUrgent' : 'timer'}
              icon="timer"
              testID="question-timer"
            />
          }
        />
      }
      footer={
        isFeedback && feedback ? (
          <>
            <FeedbackBanner outcome={feedback.correct ? 'correct' : feedback.timedOut ? 'timeout' : 'wrong'} chosenText={chosenText} />
            <Button label={nextLabel} onPress={onNextQuestion} testID="duel-next-question" />
          </>
        ) : (
          <View style={styles.speedNote}>
            <Icon name="timer" size={14} color={colors.textMuted} />
            <Text style={styles.muted}>Speed never scores, so take your time to think</Text>
          </View>
        )
      }
    >
      {state.reconnectedNotice && (
        <ConnectionBanner
          missedQuestions={state.reconnectedNotice.missedQuestions}
          resumeQuestion={state.reconnectedNotice.resumeQuestion}
          onDismiss={onDismissReconnect}
        />
      )}

      {!isSolo && state.rival ? (
        <ScoreboardCard
          youAvatar={youAvatar}
          rival={state.rival}
          yourDots={state.yourDots}
          rivalProgress={state.rivalProgress}
          yourScore={yourScore}
          rivalScore={getRivalScore(state)}
          activeIndex={activeIndex}
          questionCount={total}
        />
      ) : (
        <View style={styles.soloStrip} testID="solo-progress-strip">
          <View style={styles.soloLabel}>
            <Icon name="target" size={16} color={colors.brandPrimary} />
            <Text style={type.labelStrong}>Solo · {yourScore} correct</Text>
          </View>
          <DotTrack dots={state.yourDots} activeIndex={activeIndex} testID="your-dots" />
        </View>
      )}

      {state.yourDots.includes('timeout') && (
        <Text style={styles.legend} testID="timeout-legend">
          Grey dot = no answer (timed out)
        </Text>
      )}

      {!question || state.awaitingNext ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brandPrimary} />
          <Text style={styles.muted}>Loading the next question…</Text>
        </View>
      ) : (
        <>
          <View style={styles.questionHead}>
            <Text style={styles.overline}>
              {cat.name.toUpperCase()} · {isSolo ? 'SOLO' : `VS ${state.rival?.name.toUpperCase() ?? 'RIVAL'}`}
            </Text>
            <Text style={styles.prompt} testID="question-prompt" accessibilityRole="header">
              {question.prompt}
            </Text>
          </View>
          <View style={styles.options}>
            {question.options.map((opt, i) => (
              <AnswerOption
                key={`${question.index}-${i}`}
                index={i}
                text={opt}
                state={optionState(i)}
                disabled={isFeedback || state.selectedOption !== null}
                onPress={() => onSelectOption(i)}
                testID={`duel-option-${i}`}
              />
            ))}
          </View>
        </>
      )}
    </DuelPage>
  );
}

const styles = StyleSheet.create({
  soloStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  soloLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legend: { ...type.labelDefault, color: colors.textMuted, marginTop: -spacing.sm },
  loading: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  questionHead: { gap: spacing.xs },
  overline: { ...type.overline, color: colors.feedbackXp },
  prompt: type.titleSection,
  options: { gap: spacing.md },
  speedNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.xs },
  muted: { ...type.bodyDefault, color: colors.textMuted },
});
