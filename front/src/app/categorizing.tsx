import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Platform } from 'react-native';

import { ConsentCard } from '@/components/categorizing/ConsentCard';
import { FlowMessage } from '@/components/categorizing/FlowMessage';
import { FlowPage } from '@/components/categorizing/FlowPage';
import { KnowCard } from '@/components/categorizing/KnowCard';
import { MapDock } from '@/components/categorizing/MapDock';
import { LiveRegions } from '@/components/categorizing/LiveRegions';
import { LockedLessons } from '@/components/categorizing/LockedLessons';
import { PathSteps, type Step } from '@/components/categorizing/PathSteps';
import { QuickCheckPage } from '@/components/categorizing/QuickCheckPage';
import { Button } from '@/components/Button';
import { GOAL_GROUPS, LIFE_STAGES } from '@/constants/onboarding';
import { STATUS_TEXT } from '@/constants/quickCheck';
import { colors } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { continueToLearn } from '@/hooks/useOpenLearn';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useQuickCheck } from '@/hooks/useQuickCheck';
import { categorize, checkBackend, factLabels, factsFrom, isRetryable, withTimeout } from '@/lib/categorization';
import { setSummary } from '@/lib/learningPath';
import { answerCounts, fetchCheckQuestions } from '@/lib/quickCheck';
import type { CheckQuestion, QuickResult } from '@/types/quickCheck';

const STEP_MS = 800;
const MIN_MS = 2400;

const STEPS = {
  answers: 'Reading your answers',
  accounts: 'Looking at your accounts',
  picking: 'Picking your first lessons',
} as const;
type StepId = keyof typeof STEPS;
const WITH_ACCOUNTS: StepId[] = ['answers', 'accounts', 'picking'];
const ANSWERS_ONLY: StepId[] = ['answers', 'picking'];

const ERROR_TITLE = 'Your path stopped halfway';
const CHECK_ERROR_TITLE = "Your learning path didn't load";

type Phase = 'consent' | 'know' | 'quick' | 'loading' | 'error';

const GOAL_LABEL = Object.fromEntries(GOAL_GROUPS.flatMap((g) => g.goals.map((goal) => [goal.value, goal.label])));

/** After a fresh onboarding: ask whether account data may be used, show what we know, the Quick check, then build the learning path. */
export default function CategorizingScreen() {
  const { state: bank } = useBank();
  const { answers } = useOnboarding();
  // Computed once per visit, so the facts sent are exactly the ones the card previewed.
  const [facts] = useState(() => factsFrom(bank));
  const labels = factLabels(facts);
  const [check, setCheck] = useState<'pending' | 'ask' | 'failed'>('pending');
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('consent');
  const [consent, setConsent] = useState(false);
  const [pool, setPool] = useState<CheckQuestion[]>([]);
  const sent = useRef<Partial<QuickResult> | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [retryable, setRetryable] = useState(true);
  const inFlight = useRef(false);
  const visit = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    visit.current = ctrl;
    return () => ctrl.abort();
  }, []);

  /** The one categorisation call; `quickResult` is absent when the Quick check was skipped. */
  const start = async (withConsent: boolean, quickResult?: Partial<QuickResult>) => {
    const outer = visit.current?.signal;
    if (inFlight.current || !outer) return;
    inFlight.current = true;
    sent.current = quickResult;
    setConsent(withConsent);
    setStep(0);
    setPhase('loading');
    const judged = withTimeout(outer, (signal) => categorize(withConsent ? facts : null, signal, quickResult));
    const [result] = await Promise.allSettled([judged, new Promise((r) => setTimeout(r, MIN_MS))]);
    if (outer.aborted) return;
    if (result.status === 'fulfilled') {
      const history = quickResult?.history;
      setSummary({
        categorization: result.value,
        counts: history && answerCounts(history, pool),
        chipped: history?.some((h) => h.confidence !== null),
      });
      return router.replace('/learning-path');
    }
    inFlight.current = false;
    setRetryable(isRetryable(result.reason));
    setPhase('error');
  };

  const quick = useQuickCheck({
    pool,
    bank,
    consent,
    facts,
    lifeStageSkipped: !answers.lifeStage,
    onFinish: (result) => void start(consent, result),
    onSkip: (useRules, calls) =>
      void start(consent, useRules || calls > 0 ? { ...(useRules && { useRules }), ...(calls > 0 && { stepCallsMade: calls }) } : undefined),
  });

  useEffect(() => {
    const ctrl = new AbortController();
    withTimeout(ctrl.signal, async (signal) => {
      await checkBackend(signal);
      return fetchCheckQuestions(signal);
    }).then(
      (questions) => {
        if (ctrl.signal.aborted) return;
        setPool(questions);
        setCheck('ask');
      },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        setRetryable(isRetryable(e));
        setCheck('failed');
      },
    );
    return () => ctrl.abort();
  }, [checkAttempt]);
  const recheck = () => {
    setCheck('pending');
    setCheckAttempt((a) => a + 1);
  };

  const { back } = quick;
  const goBack = useCallback(() => {
    back();
    setPhase('know');
  }, [back]);

  // Leaving with the hardware back button would drop the user out of the flow uncategorised.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (phase === 'quick') goBack();
        return true;
      });
      return () => sub.remove();
    }, [phase, goBack]),
  );

  const ids = consent ? WITH_ACCOUNTS : ANSWERS_ONLY;

  useEffect(() => {
    if (phase !== 'loading') return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, ids.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [phase, ids.length]);

  const quickStatus = quick.stage === 'waiting' || quick.stage === 'done' ? quick.stage : null;
  const status = phase === 'loading' ? STEPS[ids[step]] : phase === 'quick' && quickStatus ? STATUS_TEXT[quickStatus] : undefined;
  const alert = phase === 'error' ? ERROR_TITLE : check === 'failed' ? CHECK_ERROR_TITLE : undefined;
  // Native announces; web reads the live regions (aria-live on a Text is web-only). A question is read by the focus
  // that lands on its prompt, so only the quiz's status lines are announced.
  useEffect(() => {
    const message = status ?? alert;
    if (Platform.OS !== 'web' && message) AccessibilityInfo.announceForAccessibility(message);
  }, [phase, status, alert]);

  /** Consent given or declined: "What we know" follows, unless there are no questions. */
  const decide = (withConsent: boolean) => {
    setConsent(withConsent);
    if (!pool.length) return void start(withConsent);
    setPhase('know');
  };
  const begin = (useRules: boolean) => {
    quick.begin(useRules);
    setPhase('quick');
  };
  const screen = (): ReactNode => {
    if (phase === 'quick') {
      return (
        <QuickCheckPage
          view={quick.view}
          position={quick.position}
          total={quick.total}
          status={quickStatus}
          ready={quick.ready}
          dock={quick.view?.kind === 'knowledge' ? <MapDock marks={quick.dock} /> : undefined}
          onAnswer={quick.answer}
          onBack={goBack}
        />
      );
    }

    if (phase === 'know') {
      return (
        <FlowPage
          testID="categorizing-know"
          footer={
            <>
              <Button label="Start the quick check" onPress={() => begin(false)} testID="know-start" />
              <Button label="Change account access" variant="secondary" onPress={() => setPhase('consent')} testID="know-change" />
              <Button label="Use simple check instead" variant="ghost" onPress={() => begin(true)} testID="know-simple" />
            </>
          }
        >
          <KnowCard
            lifeStage={LIFE_STAGES.find((s) => s.value === answers.lifeStage)?.title ?? null}
            goals={answers.goals.map((goal) => GOAL_LABEL[goal])}
            facts={consent ? labels : null}
          />
        </FlowPage>
      );
    }

    if (phase === 'consent') {
      if (check === 'failed') {
        return (
          <FlowPage
            testID="categorizing-check-error"
            center
            note="You'll start with the general lessons."
            footer={
              <>
                {retryable && <Button label="Retry" onPress={recheck} testID="categorizing-check-retry" />}
                <Button
                  label="Skip for now"
                  variant={retryable ? 'ghost' : 'primary'}
                  onPress={() => continueToLearn()}
                  testID="categorizing-check-skip"
                />
              </>
            }
          >
            <FlowMessage
              title={CHECK_ERROR_TITLE}
              body={retryable ? 'Try again in a moment.' : "We couldn't open your learning path this time."}
            />
          </FlowPage>
        );
      }
      if (check === 'pending') {
        return (
          <FlowPage testID="categorizing-checking" center>
            <ActivityIndicator color={colors.brandPrimary} accessibilityLabel="Checking your learning path" />
          </FlowPage>
        );
      }
      return (
        <FlowPage
          testID="categorizing-consent"
          footer={
            <>
              <Button label="Use my account data" onPress={() => decide(true)} testID="consent-accept" />
              <Button
                label="Continue without"
                variant="secondary"
                onPress={() => decide(false)}
                testID="consent-decline"
              />
            </>
          }
        >
          <ConsentCard facts={labels} quickCheck={pool.length > 0} />
        </FlowPage>
      );
    }

    const steps: Step[] = ids.map((id, i) => {
      const label = STEPS[id];
      if (i < step) return { id, label, state: 'done', detail: 'Done' };
      if (i > step) return { id, label, state: 'next', detail: phase === 'error' ? 'Not started' : 'Next' };
      if (phase === 'error') return { id, label, state: 'fail', detail: 'Not finished' };
      return { id, label, state: 'now', detail: id === 'accounts' ? `${labels.length} summaries` : 'In progress' };
    });

    if (phase === 'loading') {
      return (
        <FlowPage testID="categorizing-loading" center>
          <FlowMessage title="Building your learning path…" body="This takes a few seconds.">
            <PathSteps steps={steps} />
            <LockedLessons />
          </FlowMessage>
        </FlowPage>
      );
    }

    return (
      <FlowPage
        testID="categorizing-error"
        center
        note="You'll start with the general lessons."
        footer={
          <>
            {retryable && (
              <Button label="Retry" onPress={() => void start(consent, sent.current)} testID="categorizing-retry" />
            )}
            <Button
              label="Skip for now"
              variant={retryable ? 'ghost' : 'primary'}
              onPress={() => continueToLearn()}
              testID="categorizing-skip"
            />
          </>
        }
      >
        <FlowMessage
          title={ERROR_TITLE}
          body={
            retryable
              ? "We couldn't finish building your path. Trying again takes a few seconds."
              : "We couldn't pick lessons for this profile this time."
          }
        >
          <PathSteps steps={steps} />
        </FlowMessage>
      </FlowPage>
    );
  };

  return (
    <>
      <LiveRegions status={status} alert={alert} />
      {screen()}
    </>
  );
}
