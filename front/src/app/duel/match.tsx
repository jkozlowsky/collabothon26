import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { DuelPage } from '@/components/duel/DuelPage';
import { MatchmakingView } from '@/components/duel/MatchmakingView';
import { QuestionView } from '@/components/duel/QuestionView';
import { ResultView } from '@/components/duel/ResultView';
import { WaitingView } from '@/components/duel/WaitingView';
import { useAccount } from '@/hooks/useAccount';
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

  // Match routes sit outside the onboarding guard (so a reload can resume): enforce it here, before any request is made.
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
    leave,
    playAgain,
    retry,
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

  // The account owns the avatar; the match card is the fallback while it loads.
  const { account } = useAccount();
  const youAvatar = account?.avatar ?? state.you?.avatar ?? 'm1';

  if (state.error && state.phase !== 'result') {
    return (
      <DuelPage testID="duel-error" centered>
        <EmptyState icon="wifi-off" tone="danger" title="Something went wrong" body={state.error.message}>
          <Button label="Try again" onPress={retry} testID="duel-error-retry" />
          <Button label="Back to lobby" variant="secondary" onPress={exitToLobby} testID="duel-error-lobby" />
        </EmptyState>
      </DuelPage>
    );
  }

  if (state.phase === 'matchmaking') {
    return (
      <MatchmakingView
        state={state}
        youAvatar={youAvatar}
        initialElo={initialElo}
        initialCalibrated={initialCalibrated}
        onCancel={exitToLobby}
      />
    );
  }

  if (state.phase === 'waiting') {
    return <WaitingView state={state} youAvatar={youAvatar} onBackToLobby={exitToLobby} />;
  }

  if (state.phase === 'result' && state.result) {
    return (
      <ResultView
        result={state.result}
        youName={account?.firstName ?? state.you?.name}
        youAvatar={youAvatar}
        onPlayAgain={playAgain}
        onSeeRankings={openRankings}
        onBackToLobby={exitToLobby}
      />
    );
  }

  return (
    <QuestionView
      state={state}
      youAvatar={youAvatar}
      secondsLeft={secondsLeft}
      onSelectOption={selectOption}
      onNextQuestion={nextQuestion}
      onDismissReconnect={dismissReconnectBanner}
      onExit={exitToLobby}
    />
  );
}
