import { StyleSheet, Text, View } from 'react-native';

import { DotTrack } from '@/components/duel/DotTrack';
import { DuelPage } from '@/components/duel/DuelPage';
import { FlowHeader } from '@/components/duel/FlowHeader';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { getYourScore, type DuelMatchState } from '@/lib/duel/reducer';
import type { AvatarId } from '@/types/account';

type Props = {
  state: DuelMatchState;
  youAvatar: AvatarId;
  onBackToLobby: () => void;
};

/** Waiting screen when player finished all questions and rival is still answering (Figma 157:4376). */
export function WaitingView({ state, youAvatar, onBackToLobby }: Props) {
  const total = state.questionCount;
  const rival = state.rival;
  const rivalName = rival?.name ?? 'Rywal';
  const answered = state.rivalAnswered;
  const rivalQuestion = Math.min(answered + 1, total);
  const yourScore = getYourScore(state);
  const xpGained = state.yourFinal?.xpGained ?? yourScore * 5;

  return (
    <DuelPage
      testID="duel-waiting"
      header={
        <FlowHeader
          onClose={onBackToLobby}
          closeLabel="Wróć do lobby"
          closeTestID="waiting-close"
          title="Odpowiedziałeś na wszystkie"
          progress={1}
        />
      }
      footer={
        <View style={styles.footerWrap}>
          <Tappable
            onPress={onBackToLobby}
            accessibilityRole="button"
            accessibilityLabel="Wróć później do lobby"
            testID="waiting-back-lobby"
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>Wróć później</Text>
          </Tappable>
          <Text style={styles.footerNote}>Twój wynik jest zapisany i czeka na rywala</Text>
        </View>
      }
    >
      {/* Navy score block with XP pill */}
      <View style={styles.navyScoreBlock} testID="waiting-score-block">
        <Text style={styles.overline}>ŚWIETNIE, SKOŃCZYŁEŚ!</Text>
        <Text style={styles.scoreText}>
          {yourScore} / {total} poprawnych
        </Text>
        <View style={styles.xpPill}>
          <Text style={styles.xpPillText}>+{xpGained} XP</Text>
        </View>
      </View>

      {/* Light rival card */}
      <View style={styles.rivalCard} testID="waiting-rival-card">
        <PlayerAvatar avatar={rival?.avatar} size={48} ring="xp" />
        <View style={styles.rivalContent}>
          <Text style={styles.rivalTitle}>
            {rivalName} rozwiązuje pytanie {rivalQuestion} z {total}
          </Text>
          <DotTrack
            dots={state.rivalDots}
            activeIndex={answered < total ? answered : null}
            testID="waiting-rival-dots"
          />
        </View>
      </View>
    </DuelPage>
  );
}

const styles = StyleSheet.create({
  navyScoreBlock: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  overline: {
    ...type.overline,
    color: colors.brandAccent,
  },
  scoreText: {
    ...type.displayAmount,
    color: colors.textOnBrand,
  },
  xpPill: {
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  xpPillText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
  rivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
  },
  rivalContent: {
    flex: 1,
    gap: spacing.sm,
  },
  rivalTitle: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  footerWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  backLinkText: {
    ...type.labelStrong,
    color: colors.brandPrimary,
    textDecorationLine: 'underline',
  },
  footerNote: {
    ...type.labelDefault,
    color: colors.textMuted,
  },
});
