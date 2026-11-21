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
import { isDuelMode } from '@/lib/duel/meta';
import { useDuelMatch } from '@/lib/duel/useDuelMatch';
import type { DuelMode } from '@/types/duel';

export default function DuelMatchScreen() {
  const params = useLocalSearchParams<{
    categories?: string;
    mode?: string;
    matchId?: string;
  }>();

  const categories = params.categories ? params.categories.split(',').filter(Boolean) : ['berlin'];
  const mode: DuelMode = isDuelMode(params.mode) ? params.mode : 'HUMAN';
  const reloadMatchId =
    params.matchId && Number.isFinite(Number(params.matchId))
      ? Number(params.matchId)
      : undefined;

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
      key={`${categories.join('-')}-${mode}-${reloadMatchId ?? ''}`}
      categories={categories}
      mode={mode}
      reloadMatchId={reloadMatchId}
    />
  );
}

function MatchSession({
  categories,
  mode,
  reloadMatchId,
}: {
  categories: string[];
  mode: DuelMode;
  reloadMatchId?: number;
}) {
  const {
    state,
    secondsLeft,
    submitAnswer,
    nextQuestion,
    leave,
    retry,
  } = useDuelMatch({ categories, mode, reloadMatchId });

  function exitToLobby() {
    leave();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/duel');
    }
  }

  function openRankings() {
    router.replace('/duel/rankings');
  }

  const { account } = useAccount();
  const youAvatar = account?.avatar ?? state.you?.avatar ?? 'm1';

  if (state.error && state.phase !== 'result') {
    return (
      <DuelPage testID="duel-error" centered>
        <EmptyState icon="wifi-off" tone="danger" title="Something went wrong" body={state.error.message}>
          <Button label="Try again" onPress={retry} testID="duel-error-retry" />
          <Button label="Back to arena" variant="secondary" onPress={exitToLobby} testID="duel-error-lobby" />
        </EmptyState>
      </DuelPage>
    );
  }

  if (state.phase === 'matchmaking') {
    return (
      <MatchmakingView
        state={state}
        youAvatar={youAvatar}
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
        onPlayAgain={retry}
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
      onSubmitAnswer={submitAnswer}
      onNextQuestion={nextQuestion}
      onExit={exitToLobby}
    />
  );
}
