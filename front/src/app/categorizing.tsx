import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Platform } from 'react-native';

import { FlowMessage } from '@/components/categorizing/FlowMessage';
import { LiveRegions } from '@/components/categorizing/LiveRegions';
import { LockedLessons } from '@/components/categorizing/LockedLessons';
import { PathSteps, type Step } from '@/components/categorizing/PathSteps';
import { QuickCheckPage } from '@/components/categorizing/QuickCheckPage';
import { Page } from '@/components/onboarding/Page';
import { BigButton } from '@/components/onboarding/ui';
import { STATUS_TEXT } from '@/constants/quickCheck';
import { colors } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { continueToLearn } from '@/hooks/useOpenLearn';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useQuickCheck } from '@/hooks/useQuickCheck';
import { isE2E } from '@/lib/e2e';
import { categorize, checkBackend, factLabels, factsFrom, isRetryable, withTimeout } from '@/lib/categorization';
import { setSummary } from '@/lib/learningPath';
import { answerCounts, fetchCheckQuestions, savingForLine } from '@/lib/quickCheck';
import type { CheckQuestion, ProfileRanges, QuickResult } from '@/types/quickCheck';

const STEP_MS = 800;
// The path screen stays up at least this long, so people can read its steps; e2e skips the wait.
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

type Phase = 'opening' | 'quick' | 'loading' | 'error';

const NO_PROFILE: ProfileRanges = { ageBand: null, savingsCover: null, horizon: null };
// Without the survey's hand-over the user never saw the AI notice, so the path is built by rules alone.
const RULES_ONLY: Partial<QuickResult> = { useRules: true };

/**
 * After a fresh onboarding: the Quick check when the survey asked for it, then the learning path is built.
 * Without the survey's hand-over (a reload here) the path is built from the saved answers alone.
 */
export default function CategorizingScreen() {
  const { state: bank } = useBank();
  const { intake } = useOnboarding();
  // Computed once per visit, so every call of this visit sends the same facts.
  const [facts] = useState(() => factsFrom(bank));
  const labels = factLabels(facts);
  // A hand-over only exists once the user agreed on the consent screen.
  const consent = intake !== null;
  const check = intake?.check ?? null;
  const wantsCheck = check !== null;
  const [openFailed, setOpenFailed] = useState(false);
  const [openAttempt, setOpenAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('opening');
  const pool = useRef<CheckQuestion[]>([]);
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

  /** The one categorisation call; `quickResult` is absent when the Quick check did not run. */
  const start = async (quickResult: Partial<QuickResult> | undefined = intake ? undefined : RULES_ONLY) => {
    const outer = visit.current?.signal;
    if (inFlight.current || !outer || outer.aborted) return;
    inFlight.current = true;
    sent.current = quickResult;
    setStep(0);
    setPhase('loading');
    const judged = withTimeout(outer, (signal) => categorize(consent ? facts : null, signal, quickResult));
    const [result] = await Promise.allSettled([judged, new Promise((r) => setTimeout(r, isE2E() ? 0 : MIN_MS))]);
    if (outer.aborted) return;
    if (result.status === 'fulfilled') {
      const history = quickResult?.history;
      setSummary({
        categorization: result.value,
        counts: history && answerCounts(history, pool.current),
        savingFor: savingForLine(intake?.purpose ?? null, intake?.horizon ?? null),
      });
      return router.replace('/learning-path');
    }
    inFlight.current = false;
    setRetryable(isRetryable(result.reason));
    setPhase('error');
  };

  const quick = useQuickCheck({
    consent,
    facts,
    profile: check?.profile ?? NO_PROFILE,
    onFinish: (result) => void start(result),
    onSkip: () => void start(),
  });

  // No questions (or no hand-over) leaves the test out: the F1 path.
  const opened = useEffectEvent((questions: CheckQuestion[]) => {
    pool.current = questions;
    if (!wantsCheck || !questions.length) return void start();
    setPhase('quick');
    quick.begin(questions);
  });
  useEffect(() => {
    const ctrl = new AbortController();
    withTimeout(ctrl.signal, async (signal) => {
      await checkBackend(signal);
      return wantsCheck ? fetchCheckQuestions(signal) : [];
    }).then(
      (questions) => {
        if (!ctrl.signal.aborted) opened(questions);
      },
      (e: unknown) => {
        if (ctrl.signal.aborted) return;
        setRetryable(isRetryable(e));
        setOpenFailed(true);
      },
    );
    return () => ctrl.abort();
  }, [openAttempt, wantsCheck]);
  const reopen = () => {
    setOpenFailed(false);
    setOpenAttempt((a) => a + 1);
  };

  // Leaving with the hardware back button would drop the user out of the flow uncategorised.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  const ids = consent ? WITH_ACCOUNTS : ANSWERS_ONLY;

  useEffect(() => {
    if (phase !== 'loading') return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, ids.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [phase, ids.length]);

  const feedback = phase === 'quick' ? quick.view?.result?.feedback : undefined;
  const quickStatus = phase === 'quick' && quick.status ? STATUS_TEXT[quick.status] : feedback && `${feedback.title}. ${feedback.body}`;
  const status = phase === 'loading' ? STEPS[ids[step]] : quickStatus;
  const alert = phase === 'error' ? ERROR_TITLE : phase === 'opening' && openFailed ? CHECK_ERROR_TITLE : undefined;
  // Native announces; web reads the live regions (aria-live on a Text is web-only). A question is read by the focus
  // that lands on its prompt, so only the quiz's feedback and status lines are announced.
  useEffect(() => {
    const message = status ?? alert;
    if (Platform.OS !== 'web' && message) AccessibilityInfo.announceForAccessibility(message);
  }, [phase, status, alert]);

  const screen = (): ReactNode => {
    if (phase === 'quick') {
      return (
        <QuickCheckPage
          view={quick.view}
          position={quick.position}
          total={quick.total}
          status={quick.status}
          onAnswer={quick.answer}
          onContinue={quick.proceed}
        />
      );
    }

    if (phase === 'opening') {
      if (!openFailed) {
        return (
          <Page testID="categorizing-checking" center>
            <ActivityIndicator color={colors.brandPrimary} accessibilityLabel="Checking your learning path" />
          </Page>
        );
      }
      return (
        <Page
          testID="categorizing-check-error"
          center
          note="You'll start with the general lessons."
          footer={
            <>
              {retryable && <BigButton label="Retry" onPress={reopen} testID="categorizing-check-retry" />}
              <BigButton
                label="Continue to Learn"
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
        </Page>
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
        <Page testID="categorizing-loading" center>
          <FlowMessage title="Building your learning path…" body="This takes a few seconds.">
            <PathSteps steps={steps} />
            <LockedLessons />
          </FlowMessage>
        </Page>
      );
    }

    return (
      <Page
        testID="categorizing-error"
        center
        note="You'll start with the general lessons."
        footer={
          <>
            {retryable && (
              <BigButton label="Retry" onPress={() => void start(sent.current)} testID="categorizing-retry" />
            )}
            <BigButton
              label="Continue to Learn"
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
      </Page>
    );
  };

  return (
    <>
      <LiveRegions status={status} alert={alert} />
      {screen()}
    </>
  );
}
