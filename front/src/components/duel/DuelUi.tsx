import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { BotAvatar, ExplorerAvatar } from '@/components/duel/ExplorerAvatar';
import { colors, elevation, fonts, radii, spacing, type } from '@/constants/theme';
import type { LocalDot, RivalProgress } from '@/lib/duel/reducer';
import type { BankIconName } from '@/types/bank';
import type { DotResult, PlayerCard } from '@/types/duel';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

type DotTrackProps = {
  dots: (LocalDot | DotResult)[];
  /** 0-based active question index rendered as a hollow ring. */
  activeIndex?: number | null;
  testID?: string;
};

/** 6-dot progress strip: green = right, red = wrong, grey = timed out, ring = current, light grey = pending. */
export function DotTrack({ dots, activeIndex = null, testID }: DotTrackProps) {
  return (
    <View style={styles.dotRow} testID={testID}>
      {dots.map((d, i) => {
        const isCurrent = activeIndex === i && d === null;
        let dotStyle: ViewStyle = styles.dotPending;
        if (d === true || d === 'correct') dotStyle = styles.dotCorrect;
        else if (d === false || d === 'wrong') dotStyle = styles.dotWrong;
        else if (d === 'timeout') dotStyle = styles.dotTimeout;
        else if (isCurrent) dotStyle = styles.dotCurrent;

        return <View key={i} style={[styles.dot, dotStyle]} />;
      })}
    </View>
  );
}

type ChipTone = 'calibrating' | 'timer' | 'timerUrgent' | 'elo' | 'offline' | 'bot' | 'online' | 'xp' | 'success';

type StatusChipProps = {
  label: string;
  tone: ChipTone;
  icon?: BankIconName;
  dotColor?: string;
  testID?: string;
};

/** Pill chips from "Duel · Design Kit additions" (screen 9). */
export function StatusChip({ label, tone, icon, dotColor, testID }: StatusChipProps) {
  const palette = CHIP_PALETTE[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]} testID={testID}>
      {dotColor && <View style={[styles.chipDot, { backgroundColor: dotColor }]} />}
      {icon && <Icon name={icon} size={13} color={palette.icon} />}
      <Text style={[styles.chipText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const CHIP_PALETTE: Record<ChipTone, { bg: string; text: string; icon: string }> = {
  calibrating: { bg: colors.brandPrimarySoft, text: colors.textMuted, icon: colors.textMuted },
  timer: { bg: colors.brandAccentSoft, text: colors.brandPrimary, icon: colors.brandPrimary },
  timerUrgent: { bg: colors.feedbackDangerSoft, text: colors.feedbackDanger, icon: colors.feedbackDanger },
  elo: { bg: colors.brandPrimarySoft, text: colors.brandPrimary, icon: colors.brandPrimary },
  offline: { bg: colors.feedbackDangerSoft, text: colors.feedbackDanger, icon: colors.feedbackDanger },
  bot: { bg: 'rgba(110, 90, 214, 0.14)', text: colors.storyViolet, icon: colors.storyViolet },
  online: { bg: colors.feedbackSuccessSoft, text: colors.feedbackSuccess, icon: colors.feedbackSuccess },
  xp: { bg: colors.bgSurface, text: colors.textPrimary, icon: colors.feedbackXp },
  success: { bg: colors.bgSurface, text: colors.textPrimary, icon: colors.feedbackSuccess },
};

type ScoreboardCardProps = {
  you: PlayerCard | null;
  rival: PlayerCard;
  yourDots: LocalDot[];
  rivalProgress: RivalProgress | null;
  yourScore: number;
  rivalScore: number;
  activeIndex: number | null;
  questionCount: number;
};

/** Live scoreboard card shown on screens 3, 4 and edge states (offline rival / bot rival). */
export function ScoreboardCard({
  you,
  rival,
  yourDots,
  rivalProgress,
  yourScore,
  rivalScore,
  activeIndex,
  questionCount,
}: ScoreboardCardProps) {
  const rivalDots: DotResult[] =
    rivalProgress?.results ?? Array.from({ length: questionCount }, () => null);
  const rivalCurrent = rivalProgress
    ? rivalProgress.answered < questionCount
      ? rivalProgress.answered
      : null
    : 0;
  const rivalOffline = rivalProgress !== null && !rivalProgress.connected;

  return (
    <View style={[styles.scoreboard, elevation.low]} testID="duel-scoreboard">
      <View style={styles.scoreboardMain}>
        <ExplorerAvatar rank={you?.avatar ?? 2} size={38} ringColor={colors.storyTeal} />
        <View style={styles.playerCol}>
          <Text style={styles.playerName} numberOfLines={1}>
            You
          </Text>
          <DotTrack dots={yourDots} activeIndex={activeIndex} testID="your-dots" />
        </View>

        <Text style={styles.scoreCenter} testID="live-score">
          {yourScore} : {rivalScore}
        </Text>

        <View style={[styles.playerCol, styles.playerColRight]}>
          <Text style={styles.playerName} numberOfLines={1}>
            {rival.name}
          </Text>
          <DotTrack dots={rivalDots} activeIndex={rivalCurrent} testID="rival-dots" />
        </View>
        {rival.isBot ? (
          <BotAvatar size={38} />
        ) : (
          <ExplorerAvatar
            rank={rival.avatar}
            size={38}
            ringColor={colors.feedbackXp}
            dimmed={rivalOffline}
          />
        )}
      </View>

      {(rival.isBot || rivalOffline) && (
        <View style={styles.offlineRow}>
          {rival.isBot && (
            <StatusChip label="Bot · practice, no Elo" tone="bot" icon="bot" testID="rival-bot-chip" />
          )}
          {rivalOffline && (
            <StatusChip
              label="Rival reconnecting..."
              tone="offline"
              icon="wifi-off"
              testID="rival-offline-chip"
            />
          )}
        </View>
      )}
    </View>
  );
}

export type AnswerOptionVisualState = 'default' | 'pending' | 'correct' | 'wrong' | 'dimmed';

type AnswerOptionProps = {
  index: number;
  text: string;
  visualState: AnswerOptionVisualState;
  disabled: boolean;
  onPress: () => void;
  testID?: string;
};

/** Answer Option card from screen 9: Default / Pending / Correct / Wrong / Dimmed. Always colour + icon. */
export function AnswerOption({
  index,
  text,
  visualState,
  disabled,
  onPress,
  testID,
}: AnswerOptionProps) {
  const letter = LETTERS[index] ?? String(index + 1);
  const isCorrect = visualState === 'correct';
  const isWrong = visualState === 'wrong';
  const isPending = visualState === 'pending';
  const isDimmed = visualState === 'dimmed';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isPending || isCorrect || isWrong }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        isPending && styles.optionPending,
        isCorrect && styles.optionCorrect,
        isWrong && styles.optionWrong,
        isDimmed && styles.optionDimmed,
        pressed && !disabled && styles.optionPressed,
      ]}
    >
      <View
        style={[
          styles.letterTile,
          isPending && styles.letterTilePending,
          isCorrect && styles.letterTileCorrect,
          isWrong && styles.letterTileWrong,
        ]}
      >
        <Text
          style={[
            styles.letterText,
            (isCorrect || isWrong) && styles.letterTextOnSolid,
            isDimmed && styles.textMuted,
          ]}
        >
          {letter}
        </Text>
      </View>

      <Text style={[styles.optionText, isDimmed && styles.textMuted]}>{text}</Text>

      <View
        style={[
          styles.radio,
          isPending && styles.radioPending,
          isCorrect && styles.radioCorrect,
          isWrong && styles.radioWrong,
        ]}
      >
        {isCorrect && <Icon name="check" size={14} color="#FFFFFF" />}
        {isWrong && <Icon name="close" size={14} color="#FFFFFF" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  dotCorrect: {
    backgroundColor: colors.feedbackSuccess,
  },
  dotWrong: {
    backgroundColor: colors.feedbackDanger,
  },
  dotTimeout: {
    backgroundColor: colors.storySlate,
  },
  dotCurrent: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.brandPrimary,
  },
  dotPending: {
    backgroundColor: colors.borderDefault,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipText: {
    ...type.labelStrong,
    fontSize: 12,
  },

  scoreboard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  scoreboardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerCol: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  playerColRight: {
    alignItems: 'flex-end',
  },
  playerName: {
    ...type.labelStrong,
    fontSize: 13,
    color: colors.textPrimary,
  },
  scoreCenter: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.brandPrimary,
    paddingHorizontal: 2,
  },
  offlineRow: {
    alignItems: 'center',
    paddingTop: 2,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    minHeight: 68,
  },
  optionPending: {
    backgroundColor: colors.brandAccentSoft,
    borderColor: colors.brandPrimary,
    borderWidth: 2,
  },
  optionCorrect: {
    backgroundColor: colors.bgSurface,
    borderColor: colors.feedbackSuccess,
    borderWidth: 2,
  },
  optionWrong: {
    backgroundColor: colors.bgSurface,
    borderColor: colors.feedbackDanger,
    borderWidth: 2,
  },
  optionDimmed: {
    opacity: 0.52,
  },
  optionPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  letterTile: {
    width: 40,
    height: 40,
    borderRadius: radii.tile,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterTilePending: {
    backgroundColor: colors.brandAccent,
  },
  letterTileCorrect: {
    backgroundColor: colors.feedbackSuccess,
  },
  letterTileWrong: {
    backgroundColor: colors.feedbackDanger,
  },
  letterText: {
    ...type.titleCard,
    color: colors.brandPrimary,
  },
  letterTextOnSolid: {
    color: '#FFFFFF',
  },
  optionText: {
    ...type.titleCard,
    flex: 1,
  },
  textMuted: {
    color: colors.textMuted,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioPending: {
    borderColor: colors.brandPrimary,
    borderWidth: 2,
  },
  radioCorrect: {
    backgroundColor: colors.feedbackSuccess,
    borderColor: colors.feedbackSuccess,
  },
  radioWrong: {
    backgroundColor: colors.feedbackDanger,
    borderColor: colors.feedbackDanger,
  },

});
