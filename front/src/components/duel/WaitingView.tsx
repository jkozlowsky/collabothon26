import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DotTrack } from '@/components/duel/DotTrack';
import { DuelHeading } from '@/components/duel/DuelHeading';
import { DuelPage } from '@/components/duel/DuelPage';
import { FlowHeader } from '@/components/duel/FlowHeader';
import { StatusChip } from '@/components/duel/StatusChip';
import { VersusHero } from '@/components/duel/VersusHero';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { formatClock } from '@/lib/duel/meta';
import { getRivalScore, getYourScore, type DuelMatchState } from '@/lib/duel/reducer';
import type { AvatarId } from '@/types/account';

type Props = {
  state: DuelMatchState;
  youAvatar: AvatarId;
  onBackToLobby: () => void;
};

/** Seconds per question on the server; bounds how long the rival can still take. */
const QUESTION_SECONDS = 40;

/** You finished first; the rival is still answering (Figma "Duel — Waiting"). */
export function WaitingView({ state, youAvatar, onBackToLobby }: Props) {
  const total = state.questionCount;
  const rival = state.rival;
  const rivalName = rival?.name ?? 'Rival';
  const answered = state.rivalProgress?.answered ?? 0;
  const rivalQuestion = Math.min(answered + 1, total);
  const connected = state.rivalProgress?.connected ?? true;

  return (
    <DuelPage
      testID="duel-waiting"
      header={
        <FlowHeader onClose={onBackToLobby} closeLabel="Back to lobby" closeTestID="waiting-close" title={`All ${total} answered`} progress={1} />
      }
      footer={
        <>
          <Button label="Back to lobby" variant="secondary" onPress={onBackToLobby} testID="waiting-back-lobby" />
          <Text style={styles.note}>Your result is saved either way</Text>
        </>
      }
    >
      <DuelHeading overline={`WAITING FOR ${rivalName.toUpperCase()}`} title="Nice, you're done">
        <StatusChip label={`${getYourScore(state)} / ${total} correct`} tone="success" icon="check" />
        <StatusChip label={`max ${formatClock((total - answered) * QUESTION_SECONDS)} left`} tone="xp" icon="timer" />
      </DuelHeading>

      <VersusHero
        you={{ avatar: youAvatar, label: 'You · done' }}
        rival={{ avatar: rival?.avatar, isBot: rival?.isBot, label: `${rivalName} · Q${rivalQuestion}`, dimmed: !connected }}
      >
        <Text style={styles.score}>
          {getYourScore(state)} : {getRivalScore(state)}
        </Text>
        <Text style={styles.caption}>so far</Text>
      </VersusHero>

      <View style={styles.card} testID="waiting-rival-card">
        <View style={styles.cardText}>
          <Text style={type.titleCard}>
            {rivalName} is on question {rivalQuestion} of {total}
          </Text>
          <DotTrack
            dots={state.rivalProgress?.results ?? Array.from({ length: total }, () => null)}
            activeIndex={answered < total ? answered : null}
          />
        </View>
        {rival?.isBot ? (
          <StatusChip label="Bot" tone="bot" icon="bot" />
        ) : connected ? (
          <StatusChip label="Online" tone="online" dot />
        ) : (
          <StatusChip label="Reconnecting…" tone="offline" icon="wifi-off" testID="waiting-rival-offline" />
        )}
      </View>
    </DuelPage>
  );
}

const styles = StyleSheet.create({
  score: { ...type.displayAmount, color: colors.brandAccent },
  caption: { ...type.labelDefault, color: colors.onBrandMuted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    ...elevation.low,
  },
  cardText: { flex: 1, gap: spacing.sm },
  note: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center' },
});
