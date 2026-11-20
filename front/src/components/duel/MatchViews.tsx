import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { DarkMatchmakingGlow, LightTopGradient } from '@/components/duel/DuelGradient';
import { HeroSurface } from '@/components/bank/HeroCard';
import { Icon } from '@/components/bank/Icon';
import { IconButton } from '@/components/bank/IconButton';
import {
  AnswerOption,
  DotTrack,
  ScoreboardCard,
  StatusChip,
  type AnswerOptionVisualState,
} from '@/components/duel/DuelUi';
import { BotAvatar, ExplorerAvatar, MysteryAvatar } from '@/components/duel/ExplorerAvatar';
import { colors, elevation, fonts, radii, spacing, type } from '@/constants/theme';
import { formatClock, formatNumber, formatSigned, getCategoryMeta } from '@/lib/duel/meta';
import {
  getRivalScore,
  getYourScore,
  partitionReview,
  type DuelMatchState,
} from '@/lib/duel/reducer';
import type { MatchEnd } from '@/types/duel';

// ---------- Screen 2: Matchmaking ----------

type MatchmakingViewProps = {
  state: DuelMatchState;
  initialElo?: number;
  initialCalibrated?: boolean;
  onAcceptBot: () => void;
  onKeepWaiting: () => void;
  onCancel: () => void;
};

export function MatchmakingView({
  state,
  initialElo,
  initialCalibrated = true,
  onAcceptBot,
  onKeepWaiting,
  onCancel,
}: MatchmakingViewProps) {
  const cat = getCategoryMeta(state.category);
  const isHuman = state.mode === 'HUMAN';
  const showBotButtons = isHuman && state.botOffer && !state.botOfferDismissed;
  const eloLabel =
    initialElo !== undefined
      ? initialCalibrated
        ? formatNumber(initialElo)
        : 'Calibrating'
      : 'Ranked';

  return (
    <SafeAreaView style={styles.darkScreen} testID="duel-matchmaking">
      <DarkMatchmakingGlow />
      <View style={styles.darkTopRow}>
        <IconButton icon="close" tone="onBrand" onPress={onCancel} label="Cancel matchmaking"
          testID="matchmaking-close"
        />
        {state.connection === 'reconnecting' && (
          <StatusChip label="Reconnecting..." tone="offline" icon="wifi-off" />
        )}
      </View>

      <View style={styles.mmBody}>
        {isHuman ? (
          <View style={styles.mmStage}>
            <View style={styles.mmOrbit} />
            <View style={styles.mmAvatarsRow}>
              <View style={styles.mmSide}>
                <ExplorerAvatar rank={state.you?.avatar ?? 2} size={88} ringColor={colors.brandAccent} />
                <View style={styles.mmPillLight}>
                  <Icon name="trophy" size={13} color={colors.brandPrimary} />
                  <Text style={styles.mmPillLightText}>{eloLabel}</Text>
                </View>
              </View>

              <Text style={styles.mmVs}>VS</Text>

              <View style={styles.mmSide}>
                <MysteryAvatar size={88} />
                <View style={styles.mmPillDark}>
                  <Icon name="timer" size={13} color="#FFFFFF" />
                  <Text style={styles.mmPillDarkText} testID="matchmaking-elapsed">
                    {formatClock(state.elapsedSec)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.mmSimpleStage}>
            {state.mode === 'BOT' ? (
              <BotAvatar size={84} />
            ) : (
              <View style={styles.soloBadge}>
                <Icon name="target" size={38} color={colors.brandAccent} />
              </View>
            )}
            <ActivityIndicator color={colors.brandAccent} style={{ marginTop: spacing.lg }} />
          </View>
        )}

        <View style={styles.mmCopy}>
          <Text style={[type.overline, { color: colors.brandAccent }]}>
            {state.mode === 'HUMAN' ? 'VS HUMAN' : state.mode === 'BOT' ? 'VS BOT' : 'SOLO'} ·{' '}
            {cat.name.toUpperCase()}
          </Text>
          <Text style={styles.mmTitle}>
            {isHuman
              ? 'Finding a rival...'
              : state.mode === 'BOT'
                ? 'Setting up bot match...'
                : 'Starting solo session...'}
          </Text>
          {isHuman && (
            <Text style={styles.mmSubtitle}>
              We look near your Elo first (±150). After 5 seconds anyone can join, so you never wait
              long.
            </Text>
          )}
        </View>

        {isHuman && (
          <View style={styles.mmChips} testID="matchmaking-stages">
            <TimelineStageChip label="±150 Elo" active />
            <TimelineStageChip label="Anyone" active={state.widened} />
            <TimelineStageChip label="Bot offer" active={state.botOffer} />
          </View>
        )}
      </View>

      <View style={styles.mmFooter}>
        {showBotButtons ? (
          <>
            <Button
              label="Play a bot instead"
              onPress={onAcceptBot}
              variant="primary"
              testID="matchmaking-accept-bot"
            />
            <Pressable
              onPress={onKeepWaiting}
              testID="matchmaking-keep-waiting"
              accessibilityRole="button"
              style={styles.darkGhostBtn}
            >
              <Text style={styles.darkGhostText}>Keep waiting</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={onCancel}
            testID="matchmaking-cancel"
            accessibilityRole="button"
            style={styles.darkGhostBtn}
          >
            <Text style={styles.darkGhostText}>Cancel</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function TimelineStageChip({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.stageChip, active ? styles.stageChipActive : styles.stageChipIdle]}>
      {active && <Icon name="check" size={13} color={colors.brandPrimary} />}
      <Text style={[styles.stageChipText, active ? styles.stageChipTextActive : styles.stageChipTextIdle]}>
        {label}
      </Text>
    </View>
  );
}

// ---------- Screens 3 & 4: Question + Answer Feedback ----------

type QuestionViewProps = {
  state: DuelMatchState;
  secondsLeft: number;
  onSelectOption: (option: number) => void;
  onNextQuestion: () => void;
  onDismissReconnect: () => void;
  onExit: () => void;
};

export function QuestionView({
  state,
  secondsLeft,
  onSelectOption,
  onNextQuestion,
  onDismissReconnect,
  onExit,
}: QuestionViewProps) {
  const cat = getCategoryMeta(state.category);
  const question = state.question;
  const feedback = state.feedback;
  const isFeedback = state.phase === 'feedback' && feedback !== null;
  const isSolo = state.mode === 'SOLO' || state.rival === null;
  const yourScore = getYourScore(state);
  const rivalScore = getRivalScore(state);
  const currentIndex = question?.index ?? 0;
  const progressPct = ((currentIndex + (isFeedback ? 1 : 0)) / Math.max(1, state.questionCount)) * 100;
  const hasTimeoutDot = state.yourDots.some((d) => d === 'timeout');

  function getOptionState(i: number): AnswerOptionVisualState {
    if (isFeedback && feedback) {
      if (feedback.timedOut) return 'dimmed';
      if (i === feedback.chosenOption) return feedback.correct ? 'correct' : 'wrong';
      return 'dimmed';
    }
    if (state.selectedOption === i) return 'pending';
    return 'default';
  }

  const chosenText =
    feedback && feedback.chosenOption !== null && question
      ? question.options[feedback.chosenOption]
      : null;

  const isLastQuestion = currentIndex + 1 >= state.questionCount;
  const nextLabel = state.pendingEnd
    ? 'See results'
    : isLastQuestion
      ? 'Continue'
      : 'Next question';

  return (
    <SafeAreaView style={styles.lightScreen} testID={isFeedback ? 'duel-feedback' : 'duel-question'}>
      <LightTopGradient />

      <View style={styles.flowHeader}>
        <IconButton icon="close" onPress={onExit} label="Leave match"
          testID="match-close"
        />
        <Text style={styles.headerCounter} testID="question-counter">
          Question {Math.min(currentIndex + 1, state.questionCount)} of {state.questionCount}
        </Text>
        <StatusChip
          label={formatClock(secondsLeft)}
          tone={secondsLeft <= 10 ? 'timerUrgent' : 'timer'}
          icon="timer"
          testID="question-timer"
        />
      </View>

      <View style={styles.progressTrackWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progressPct)}%` }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.flowScroll}
        showsVerticalScrollIndicator={false}
      >
        {state.connection === 'reconnecting' && (
          <View style={styles.bannerNeutral} testID="reconnecting-banner">
            <Icon name="wifi-off" size={16} color={colors.feedbackDanger} />
            <Text style={styles.bannerBody}>
              Connection lost — reconnecting. The clock keeps running on the server.
            </Text>
          </View>
        )}

        {state.reconnectedNotice && (
          <Pressable
            onPress={onDismissReconnect}
            style={styles.reconnectBanner}
            testID="reconnected-banner"
          >
            <Icon name="refresh" size={18} color={colors.brandPrimary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.reconnectTitle}>
                You&apos;re back —{' '}
                {state.reconnectedNotice.missedQuestions.length === 1
                  ? `question ${state.reconnectedNotice.missedQuestions[0]} ran out`
                  : `questions ${state.reconnectedNotice.missedQuestions.join(', ')} ran out`}
              </Text>
              <Text style={styles.bannerBody}>
                It counts as no answer.
                {state.reconnectedNotice.resumeQuestion !== null
                  ? ` Carry on with question ${state.reconnectedNotice.resumeQuestion}.`
                  : ''}
              </Text>
            </View>
          </Pressable>
        )}

        {!isSolo && state.rival ? (
          <ScoreboardCard
            you={state.you}
            rival={state.rival}
            yourDots={state.yourDots}
            rivalProgress={state.rivalProgress}
            yourScore={yourScore}
            rivalScore={rivalScore}
            activeIndex={isFeedback ? null : currentIndex}
            questionCount={state.questionCount}
          />
        ) : (
          <View style={styles.soloStrip} testID="solo-progress-strip">
            <View style={styles.soloStripLeft}>
              <Icon name="target" size={16} color={colors.brandPrimary} />
              <Text style={type.labelStrong}>Solo · {yourScore} correct</Text>
            </View>
            <DotTrack
              dots={state.yourDots}
              activeIndex={isFeedback ? null : currentIndex}
              testID="your-dots"
            />
          </View>
        )}

        {hasTimeoutDot && (
          <Text style={styles.timeoutLegend} testID="timeout-legend">
            Grey dot = no answer (timed out)
          </Text>
        )}

        {!question || state.awaitingNext ? (
          <View style={styles.loadingQuestion}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={[type.bodyDefault, { color: colors.textMuted }]}>Loading question…</Text>
          </View>
        ) : (
          <>
            <View style={styles.questionHeader}>
              <Text style={[type.overline, { color: colors.feedbackXp }]}>
                {cat.name.toUpperCase()} ·{' '}
                {isSolo ? 'SOLO' : `VS ${state.rival?.name.toUpperCase() ?? 'RIVAL'}`}
              </Text>
              <Text style={styles.prompt} testID="question-prompt">
                {question.prompt}
              </Text>
            </View>

            <View style={styles.optionsList}>
              {question.options.map((opt, i) => (
                <AnswerOption
                  key={`${question.index}-${i}`}
                  index={i}
                  text={opt}
                  visualState={getOptionState(i)}
                  disabled={isFeedback || state.selectedOption !== null}
                  onPress={() => onSelectOption(i)}
                  testID={`duel-option-${i}`}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.flowFooter}>
        {isFeedback && feedback ? (
          <>
            <View
              testID="feedback-banner"
              style={[
                styles.feedbackBanner,
                feedback.correct
                  ? styles.feedbackBannerSuccess
                  : feedback.timedOut
                    ? styles.feedbackBannerTimeout
                    : styles.feedbackBannerWrong,
              ]}
            >
              <Icon
                name={feedback.correct ? 'check' : feedback.timedOut ? 'timer' : 'close'}
                size={18}
                color={
                  feedback.correct
                    ? colors.feedbackSuccess
                    : feedback.timedOut
                      ? colors.brandPrimary
                      : colors.feedbackDanger
                }
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={[
                    styles.feedbackTitle,
                    {
                      color: feedback.correct
                        ? colors.feedbackSuccess
                        : feedback.timedOut
                          ? colors.brandPrimary
                          : colors.feedbackDanger,
                    },
                  ]}
                >
                  {feedback.correct
                    ? 'Right!'
                    : feedback.timedOut
                      ? "Time's up — no answer"
                      : chosenText
                        ? `Not quite — it isn't ${chosenText.toLowerCase()}`
                        : 'Not quite'}
                </Text>
                <Text style={styles.feedbackSub}>
                  {feedback.correct
                    ? 'Nice one — advancing shortly.'
                    : 'The right answer and why are waiting on your result screen.'}
                </Text>
              </View>
            </View>
            <Button
              label={nextLabel}
              onPress={onNextQuestion}
              variant="primary"
              testID="duel-next-question"
            />
          </>
        ) : (
          <View style={styles.speedNote}>
            <Icon name="timer" size={14} color={colors.textMuted} />
            <Text style={[type.bodyDefault, { color: colors.textMuted }]}>
              Speed never scores — take your time to think
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------- Screen 5: Waiting for Rival ----------

type WaitingViewProps = {
  state: DuelMatchState;
  onBackToLobby: () => void;
};

export function WaitingView({ state, onBackToLobby }: WaitingViewProps) {
  const yourScore = getYourScore(state);
  const rivalScore = getRivalScore(state);
  const rival = state.rival;
  const rivalAnswered = state.rivalProgress?.answered ?? 0;
  const rivalCurrentQ = Math.min(rivalAnswered + 1, state.questionCount);
  const maxRemainingSec = Math.max(0, (state.questionCount - rivalAnswered) * 40);
  const rivalConnected = state.rivalProgress?.connected ?? true;

  return (
    <SafeAreaView style={styles.lightScreen} testID="duel-waiting">
      <LightTopGradient />

      <View style={styles.flowHeader}>
        <IconButton icon="close" onPress={onBackToLobby} label="Back to lobby"
          testID="waiting-close"
        />
        <Text style={styles.headerCounter}>All {state.questionCount} answered</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressTrackWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.flowScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHead}>
          <Text style={[type.overline, { color: colors.feedbackXp }]}>
            WAITING FOR {rival?.name.toUpperCase() ?? 'RIVAL'}
          </Text>
          <Text style={type.displayLarge}>Nice, you&apos;re done</Text>
          <View style={styles.chipsRow}>
            <StatusChip
              label={`${yourScore} / ${state.questionCount} correct`}
              tone="success"
              icon="check"
            />
            <StatusChip
              label={`max ${formatClock(maxRemainingSec)} left`}
              tone="xp"
              icon="timer"
            />
          </View>
        </View>

        <HeroSurface style={styles.heroPad}>
          <View style={styles.heroScoreRow}>
            <View style={styles.heroPlayer}>
              <ExplorerAvatar rank={state.you?.avatar ?? 2} size={68} ringColor={colors.brandAccent} />
              <Text style={styles.heroPlayerLabel}>You · done</Text>
            </View>

            <View style={styles.heroMiddle}>
              <Text style={styles.heroScoreYellow}>
                {yourScore} : {rivalScore}
              </Text>
              <Text style={styles.heroCaption}>so far</Text>
            </View>

            <View style={styles.heroPlayer}>
              {rival?.isBot ? (
                <BotAvatar size={68} />
              ) : (
                <ExplorerAvatar
                  rank={rival?.avatar ?? 3}
                  size={68}
                  ringColor={colors.feedbackXp}
                  dimmed={!rivalConnected}
                />
              )}
              <Text style={styles.heroPlayerLabel}>
                {rival?.name ?? 'Rival'} · Q{rivalCurrentQ}
              </Text>
            </View>
          </View>
        </HeroSurface>

        <View style={[styles.surfaceCard, elevation.low]} testID="waiting-rival-card">
          <View style={styles.waitingRivalRow}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={type.titleCard}>
                {rival?.name ?? 'Rival'} is on question {rivalCurrentQ} of {state.questionCount}
              </Text>
              <DotTrack
                dots={
                  state.rivalProgress?.results ??
                  Array.from({ length: state.questionCount }, () => null)
                }
                activeIndex={rivalAnswered < state.questionCount ? rivalAnswered : null}
              />
            </View>

            {rival?.isBot ? (
              <StatusChip label="Bot" tone="bot" icon="bot" />
            ) : rivalConnected ? (
              <StatusChip label="Online" tone="online" dotColor={colors.feedbackSuccess} />
            ) : (
              <StatusChip
                label="Reconnecting..."
                tone="offline"
                icon="wifi-off"
                testID="waiting-rival-offline"
              />
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.flowFooter}>
        <Button
          label="Back to lobby"
          onPress={onBackToLobby}
          variant="secondary"
          testID="waiting-back-lobby"
        />
        <Text style={styles.savedNote}>Your result is saved either way</Text>
      </View>
    </SafeAreaView>
  );
}

// ---------- Screen 6: Result ----------

type ResultViewProps = {
  result: MatchEnd;
  youName?: string;
  youAvatar?: 1 | 2 | 3 | 4;
  onPlayAgain: () => void;
  onSeeRankings: () => void;
  onBackToLobby: () => void;
};

export function ResultView({
  result,
  youName,
  youAvatar = 2,
  onPlayAgain,
  onSeeRankings,
  onBackToLobby,
}: ResultViewProps) {
  const [showCorrect, setShowCorrect] = useState(false);
  const cat = getCategoryMeta(result.category);
  const total = result.review.length || 6;
  const isSolo = result.mode === 'SOLO' || result.outcome === 'SOLO';
  const hasElo = result.eloBefore !== null && result.eloAfter !== null;
  const eloDelta = hasElo ? (result.eloAfter ?? 0) - (result.eloBefore ?? 0) : null;
  const { mistakes, correct } = partitionReview(result.review);

  const overline =
    result.outcome === 'WIN'
      ? `DUEL WON · ${cat.name.toUpperCase()}`
      : result.outcome === 'DRAW'
        ? `DUEL DRAW · ${cat.name.toUpperCase()}`
        : result.outcome === 'SOLO'
          ? `SOLO FINISHED · ${cat.name.toUpperCase()}`
          : `DUEL FINISHED · ${cat.name.toUpperCase()}`;

  const heading =
    result.outcome === 'WIN'
      ? youName
        ? `You won, ${youName}`
        : 'You won!'
      : result.outcome === 'DRAW'
        ? "It's a draw"
        : result.outcome === 'SOLO'
          ? 'Nice practice'
          : youName
            ? `Good match, ${youName}`
            : 'Good match';

  const xpRatio =
    result.xpForLevel > 0 ? Math.min(1, Math.max(0, result.xpIntoLevel / result.xpForLevel)) : 0;

  const eloCaption = (() => {
    const rivalName = result.rival?.name ?? 'your rival';
    const rivalElo = result.rival?.elo != null ? ` (Elo ${formatNumber(result.rival.elo)})` : '';
    if (result.outcome === 'WIN') return `Beat ${rivalName}${rivalElo} in a ranked match.`;
    if (result.outcome === 'DRAW') return `Drew with ${rivalName}${rivalElo} in a ranked match.`;
    return `Played ${rivalName}${rivalElo} in a ranked match.`;
  })();

  return (
    <SafeAreaView style={styles.lightScreen} testID="duel-result">
      <LightTopGradient />

      <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHead}>
          <Text style={[type.overline, { color: colors.feedbackXp }]}>{overline}</Text>
          <Text style={type.displayLarge} testID="result-heading">
            {heading}
          </Text>
          <View style={styles.chipsRow}>
            <StatusChip label={`+${result.xpGained} XP`} tone="xp" icon="zap" testID="result-xp" />
            <StatusChip
              label={`${result.score} / ${total} correct`}
              tone="success"
              icon="check"
              testID="result-score-chip"
            />
            {eloDelta !== null && (
              <StatusChip
                label={`${formatSigned(eloDelta)} Elo`}
                tone="elo"
                icon="trophy"
                testID="result-elo-chip"
              />
            )}
          </View>
        </View>

        {/* Hero scoreboard (Human/Bot) or Solo summary card (Screen 8) */}
        {isSolo ? (
          <View style={[styles.surfaceCard, elevation.low]} testID="result-solo-card">
            <View style={styles.soloResultRow}>
              <View style={styles.soloIconTile}>
                <Icon name="target" size={22} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.titleCard}>
                  Solo · {result.score} / {total} correct
                </Text>
                <Text style={[type.bodyDefault, { color: colors.textMuted }]}>
                  8 XP per correct · no Elo
                </Text>
              </View>
              <StatusChip label={`+${result.xpGained} XP`} tone="xp" icon="zap" />
            </View>
          </View>
        ) : (
          <HeroSurface style={styles.heroPad} testID="result-hero-card">
            <View style={styles.heroScoreRow}>
              <View style={styles.heroPlayer}>
                <ExplorerAvatar rank={youAvatar} size={64} ringColor={colors.brandAccent} />
                <Text style={styles.heroPlayerLabel}>You</Text>
              </View>

              <View style={styles.heroMiddle}>
                <Text style={[type.overline, { color: colors.brandAccent }]}>{result.outcome}</Text>
                <Text style={styles.heroScoreWhite} testID="result-score">
                  {result.score} : {result.rivalScore ?? 0}
                </Text>
                {result.outcome === 'DRAW' && (
                  <Text style={styles.heroCaption}>
                    +{result.xpGained} XP · {hasElo ? 'Elo by expected score' : 'practice'}
                  </Text>
                )}
                {result.rival?.isBot && result.outcome !== 'DRAW' && (
                  <Text style={styles.heroCaption}>Practice · no Elo</Text>
                )}
              </View>

              <View style={styles.heroPlayer}>
                {result.rival?.isBot ? (
                  <BotAvatar size={64} />
                ) : (
                  <ExplorerAvatar
                    rank={result.rival?.avatar ?? 3}
                    size={64}
                    ringColor={colors.feedbackXp}
                  />
                )}
                <Text style={styles.heroPlayerLabel}>{result.rival?.name ?? 'Rival'}</Text>
              </View>
            </View>
          </HeroSurface>
        )}

        {/* Elo + Level stat cards */}
        <View style={styles.statRow}>
          {hasElo && result.eloBefore !== null && result.eloAfter !== null && (
            <View style={[styles.statCard, elevation.low]} testID="result-elo-card">
              <Text style={[type.overline, { color: colors.textMuted }]}>ELO · RANKED</Text>
              <View style={styles.statDeltaRow}>
                <Text style={styles.statBefore}>{formatNumber(result.eloBefore)}</Text>
                <Icon name="arrow-right" size={16} color={colors.textMuted} />
                <Text style={styles.statAfter}>{formatNumber(result.eloAfter)}</Text>
              </View>
              <Text style={[type.bodyDefault, { color: colors.textMuted }]}>{eloCaption}</Text>
            </View>
          )}

          <View style={[styles.statCard, elevation.low]} testID="result-level-card">
            <Text style={[type.overline, { color: colors.textMuted }]}>
              LEVEL · {cat.shortName.toUpperCase()}
            </Text>
            <View style={styles.statDeltaRow}>
              {result.levelAfter > result.levelBefore ? (
                <>
                  <Text style={styles.statBefore}>{result.levelBefore}</Text>
                  <Icon name="arrow-right" size={16} color={colors.textMuted} />
                  <Text style={styles.statAfter}>{result.levelAfter}</Text>
                </>
              ) : (
                <Text style={styles.statAfter}>Lv {result.levelAfter}</Text>
              )}
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.round(xpRatio * 100)}%` }]} />
            </View>
            <Text style={[type.bodyDefault, { color: colors.textMuted }]}>
              {result.xpIntoLevel} / {result.xpForLevel} XP to level {result.levelAfter + 1}
            </Text>
          </View>
        </View>

        {/* Review card — mistakes first */}
        <View style={[styles.surfaceCard, elevation.low, { gap: spacing.lg }]} testID="result-review">
          <View style={styles.reviewHeader}>
            <Icon name="refresh" size={18} color={colors.brandPrimary} />
            <Text style={type.titleCard}>
              {mistakes.length > 0
                ? `${mistakes.length} ${mistakes.length === 1 ? 'answer' : 'answers'} to review`
                : `All ${total} answers correct!`}
            </Text>
          </View>

          {mistakes.map((item, idx) => (
            <View
              key={item.questionNumber}
              style={[styles.reviewItem, idx > 0 && styles.reviewDivider]}
              testID={`review-mistake-${item.questionNumber}`}
            >
              <Text style={[type.overline, { color: colors.textMuted }]}>
                QUESTION {item.questionNumber}
              </Text>
              <Text style={styles.reviewPrompt}>{item.prompt}</Text>
              <View style={styles.reviewPills}>
                <View style={[styles.reviewPill, styles.reviewPillWrong]}>
                  <View style={styles.reviewPillIcon}>
                    <Icon name="close" size={12} color={colors.feedbackDanger} />
                  </View>
                  <Text style={[styles.reviewPillText, { color: colors.feedbackDanger }]}>
                    {item.yourOption !== null ? item.options[item.yourOption] : 'No answer'}
                  </Text>
                </View>
                <View style={[styles.reviewPill, styles.reviewPillRight]}>
                  <View style={styles.reviewPillIcon}>
                    <Icon name="check" size={12} color={colors.feedbackSuccess} />
                  </View>
                  <Text style={[styles.reviewPillText, { color: colors.feedbackSuccess }]}>
                    {item.options[item.correctOption]}
                  </Text>
                </View>
              </View>
              <Text style={[type.bodyDefault, { color: colors.textMuted }]}>{item.explanation}</Text>
            </View>
          ))}

          {correct.length > 0 && (
            <View style={mistakes.length > 0 ? styles.reviewDivider : undefined}>
              {mistakes.length > 0 && (
                <Pressable
                  onPress={() => setShowCorrect((s) => !s)}
                  accessibilityRole="button"
                  testID="toggle-correct-review"
                  style={styles.toggleCorrectBtn}
                >
                  <Text style={styles.toggleCorrectText}>
                    {showCorrect
                      ? 'Hide correct answers'
                      : `Show ${correct.length} correct ${correct.length === 1 ? 'answer' : 'answers'}`}
                  </Text>
                </Pressable>
              )}

              {(showCorrect || mistakes.length === 0) &&
                correct.map((item, idx) => (
                  <View
                    key={item.questionNumber}
                    style={[styles.reviewItem, idx > 0 && styles.reviewDivider]}
                    testID={`review-correct-${item.questionNumber}`}
                  >
                    <Text style={[type.overline, { color: colors.textMuted }]}>
                      QUESTION {item.questionNumber}
                    </Text>
                    <Text style={styles.reviewPrompt}>{item.prompt}</Text>
                    <View style={styles.reviewPills}>
                      <View style={[styles.reviewPill, styles.reviewPillRight]}>
                        <View style={styles.reviewPillIcon}>
                          <Icon
                            name="check"
                            size={12}
                            color={colors.feedbackSuccess}
                          />
                        </View>
                        <Text style={[styles.reviewPillText, { color: colors.feedbackSuccess }]}>
                          {item.options[item.correctOption]}
                        </Text>
                      </View>
                    </View>
                    <Text style={[type.bodyDefault, { color: colors.textMuted }]}>
                      {item.explanation}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </View>

        <View style={styles.resultActions}>
          <Button label="Play again" onPress={onPlayAgain} variant="primary" testID="result-play-again" />
          <Button
            label="See rankings"
            onPress={onSeeRankings}
            variant="secondary"
            testID="result-see-rankings"
          />
          <Button
            label="Back to lobby"
            onPress={onBackToLobby}
            variant="ghost"
            testID="result-back-lobby"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  darkScreen: {
    flex: 1,
    backgroundColor: colors.brandPrimary,
  },
  darkTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
  },
  mmBody: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  mmStage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
    paddingVertical: spacing.xl,
  },
  mmOrbit: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  mmAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  mmSide: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  mmVs: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.brandAccent,
    letterSpacing: 1,
    marginBottom: spacing.xl,
  },
  mmPillLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  mmPillLightText: {
    ...type.labelStrong,
    color: colors.brandPrimary,
  },
  mmPillDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  mmPillDarkText: {
    ...type.labelStrong,
    color: '#FFFFFF',
  },
  mmSimpleStage: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  soloBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 204, 0, 0.16)',
    borderWidth: 2,
    borderColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mmCopy: {
    gap: spacing.sm,
  },
  mmTitle: {
    ...type.displayLarge,
    color: '#FFFFFF',
  },
  mmSubtitle: {
    ...type.bodyDefault,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.74)',
  },
  mmChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  stageChipActive: {
    backgroundColor: colors.brandAccent,
  },
  stageChipIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  stageChipText: {
    ...type.labelStrong,
  },
  stageChipTextActive: {
    color: colors.brandPrimary,
  },
  stageChipTextIdle: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  mmFooter: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  darkGhostBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkGhostText: {
    ...type.titleCard,
    color: '#FFFFFF',
  },

  // Light screens
  lightScreen: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerCounter: {
    ...type.labelStrong,
    fontSize: 13,
    color: colors.textMuted,
  },
  progressTrackWrap: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.md,
  },
  progressTrack: {
    height: 5,
    borderRadius: radii.bar,
    backgroundColor: colors.borderDefault,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.bar,
    backgroundColor: colors.brandAccent,
  },
  flowScroll: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  flowFooter: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },

  bannerNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.feedbackDangerSoft,
    borderRadius: radii.tile,
    padding: spacing.md,
  },
  reconnectBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.brandPrimarySoft,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  reconnectTitle: {
    ...type.labelStrong,
    fontSize: 13,
    color: colors.brandPrimary,
  },
  bannerBody: {
    ...type.bodyDefault,
    color: colors.textMuted,
    flex: 1,
  },

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
  soloStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeoutLegend: {
    ...type.labelDefault,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },

  loadingQuestion: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  questionHeader: {
    gap: spacing.xs,
  },
  prompt: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 27,
    color: colors.textPrimary,
  },
  optionsList: {
    gap: spacing.md,
  },
  speedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  feedbackBannerSuccess: {
    backgroundColor: colors.feedbackSuccessSoft,
  },
  feedbackBannerWrong: {
    backgroundColor: colors.feedbackDangerSoft,
  },
  feedbackBannerTimeout: {
    backgroundColor: colors.brandPrimarySoft,
  },
  feedbackTitle: {
    ...type.labelStrong,
    fontSize: 13,
  },
  feedbackSub: {
    ...type.bodyDefault,
    color: colors.textPrimary,
  },

  // Waiting & Result shared
  sectionHead: {
    gap: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroPad: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPlayer: {
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 78,
  },
  heroPlayerLabel: {
    ...type.labelStrong,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  heroMiddle: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  heroScoreYellow: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    color: colors.brandAccent,
  },
  heroScoreWhite: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    color: '#FFFFFF',
  },
  heroCaption: {
    ...type.labelDefault,
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
  },
  surfaceCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
  },
  waitingRivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  savedNote: {
    ...type.labelDefault,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Result screen
  resultScroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  soloResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  soloIconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.tile,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md + 2,
    gap: spacing.sm,
  },
  statDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  statBefore: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textMuted,
  },
  statAfter: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  xpTrack: {
    height: 6,
    borderRadius: radii.bar,
    backgroundColor: colors.borderDefault,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: radii.bar,
    backgroundColor: colors.brandAccent,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewItem: {
    gap: spacing.sm,
  },
  reviewDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingTop: spacing.md,
  },
  reviewPrompt: {
    ...type.titleCard,
    fontSize: 14,
  },
  reviewPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reviewPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.tile,
  },
  reviewPillWrong: {
    backgroundColor: colors.feedbackDangerSoft,
  },
  reviewPillRight: {
    backgroundColor: colors.feedbackSuccessSoft,
  },
  reviewPillIcon: {
    marginTop: 2,
  },
  reviewPillText: {
    ...type.labelStrong,
    fontSize: 12,
    flexShrink: 1,
  },
  toggleCorrectBtn: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  toggleCorrectText: {
    ...type.labelStrong,
    color: colors.brandPrimary,
  },
  resultActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
