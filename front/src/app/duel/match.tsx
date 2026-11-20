import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import {
  MatchmakingView,
  QuestionView,
  ResultView,
  WaitingView,
} from '@/components/duel/MatchViews';
import { colors, spacing, type } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useOpenLearn } from '@/hooks/useOpenLearn';
import { isCategorySlug, isDuelMode } from '@/lib/duel/meta';
import { useDuelMatch } from '@/lib/duel/useDuelMatch';
import type { CategorySlug, DuelMode } from '@/types/duel';

export default function DuelMatchScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    mode?: string;
    elo?: string;
    calibrated?: string;
    matchId?: string;
  }>();

  const category = isCategorySlug(params.category) ? params.category : 'psychology';
  const mode = isDuelMode(params.mode) ? params.mode : 'BOT';
  const initialElo = params.elo ? Number(params.elo) : undefined;
  const initialCalibrated = params.calibrated !== '0';
  const reloadMatchId =
    params.matchId && !params.mode && Number.isFinite(Number(params.matchId))
      ? Number(params.matchId)
      : undefined;

  // Match routes sit outside the onboarding guard (so a reload can resume): enforce it here, before any socket opens.
  const { loaded, done } = useOnboarding();
  const openLearn = useOpenLearn();
  useEffect(() => {
    if (!loaded || done) return;
    router.replace('/duel');
    openLearn('/duel');
  }, [loaded, done, openLearn]);
  if (!loaded || !done) return null;

  return (
    <MatchSession
      key={`${category}-${mode}-${reloadMatchId ?? ''}`}
      category={category}
      mode={mode}
      initialElo={Number.isFinite(initialElo) ? initialElo : undefined}
      initialCalibrated={initialCalibrated}
      reloadMatchId={reloadMatchId}
    />
  );
}

function MatchSession({
  category,
  mode,
  initialElo,
  initialCalibrated,
  reloadMatchId,
}: {
  category: CategorySlug;
  mode: DuelMode;
  initialElo?: number;
  initialCalibrated: boolean;
  reloadMatchId?: number;
}) {
  const {
    state,
    secondsLeft,
    selectOption,
    nextQuestion,
    acceptBot,
    keepWaiting,
    leave,
    playAgain,
    dismissReconnectBanner,
  } = useDuelMatch({ category, mode, reloadMatchId });

  function exitToLobby() {
    leave();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/duel');
    }
  }

  function openRankings() {
    router.replace({
      pathname: '/duel/rankings',
      params: { scope: 'category', category: state.category },
    });
  }

  if (state.error && state.phase !== 'result') {
    return (
      <SafeAreaView style={styles.errorScreen} testID="duel-error">
        <StatusBar style="dark" />
        <View style={styles.errorIcon}>
          <Icon name="wifi-off" size={28} color={colors.feedbackDanger} />
        </View>
        <Text style={type.titleSection}>Something went wrong</Text>
        <Text style={[type.bodyDefault, styles.errorDetail]}>{state.error.message}</Text>
        <View style={styles.errorActions}>
          <Button label="Try again" onPress={playAgain} variant="primary" testID="duel-error-retry" />
          <Button
            label="Back to lobby"
            onPress={exitToLobby}
            variant="secondary"
            testID="duel-error-lobby"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (state.phase === 'matchmaking') {
    return (
      <>
        <StatusBar style="light" />
        <MatchmakingView
          state={state}
          initialElo={Number.isFinite(initialElo) ? initialElo : undefined}
          initialCalibrated={initialCalibrated}
          onAcceptBot={acceptBot}
          onKeepWaiting={keepWaiting}
          onCancel={exitToLobby}
        />
      </>
    );
  }

  if (state.phase === 'waiting') {
    return (
      <>
        <StatusBar style="dark" />
        <WaitingView state={state} onBackToLobby={exitToLobby} />
      </>
    );
  }

  if (state.phase === 'result' && state.result) {
    return (
      <>
        <StatusBar style="dark" />
        <ResultView
          result={state.result}
          youName={state.you?.name}
          youAvatar={state.you?.avatar}
          onPlayAgain={playAgain}
          onSeeRankings={openRankings}
          onBackToLobby={exitToLobby}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <QuestionView
        state={state}
        secondsLeft={secondsLeft}
        onSelectOption={selectOption}
        onNextQuestion={nextQuestion}
        onDismissReconnect={dismissReconnectBanner}
        onExit={exitToLobby}
      />
    </>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.feedbackDangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorDetail: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
