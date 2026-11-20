import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Platform } from 'react-native';

import { ConsentCard } from '@/components/categorizing/ConsentCard';
import { FlowMessage } from '@/components/categorizing/FlowMessage';
import { FlowPage } from '@/components/categorizing/FlowPage';
import { LockedLessons } from '@/components/categorizing/LockedLessons';
import { PathSteps, type Step } from '@/components/categorizing/PathSteps';
import { Button } from '@/components/Button';
import { colors } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { continueToLearn } from '@/hooks/useOpenLearn';
import { categorize, factLabels, factsFrom, isCategorized, isRetryable, withTimeout } from '@/lib/categorization';

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

type Phase = 'consent' | 'loading' | 'error';

/** After a fresh onboarding: ask whether account data may be used, then build the learning path. */
export default function CategorizingScreen() {
  const { state: bank } = useBank();
  // Computed once per visit, so the facts sent are exactly the ones the card previewed.
  const [facts] = useState(() => factsFrom(bank));
  const labels = factLabels(facts);
  const [check, setCheck] = useState<'pending' | 'ask' | 'failed'>('pending');
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('consent');
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState(0);
  const [retryable, setRetryable] = useState(true);
  const inFlight = useRef(false);
  const visit = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    visit.current = ctrl;
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    withTimeout(ctrl.signal, isCategorized).then(
      (categorized) => {
        if (ctrl.signal.aborted) return;
        if (categorized) continueToLearn();
        else setCheck('ask');
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

  const status = phase === 'loading' ? STEPS[ids[step]] : undefined;
  const alert = phase === 'error' ? ERROR_TITLE : check === 'failed' ? CHECK_ERROR_TITLE : undefined;
  // Native announces; web reads FlowPage's live regions (aria-live on a Text is web-only).
  useEffect(() => {
    const message = status ?? alert;
    if (Platform.OS !== 'web' && message) AccessibilityInfo.announceForAccessibility(message);
  }, [status, alert]);

  const start = async (withConsent: boolean) => {
    const outer = visit.current?.signal;
    if (inFlight.current || !outer) return;
    inFlight.current = true;
    setConsent(withConsent);
    setStep(0);
    setPhase('loading');
    const [result] = await Promise.allSettled([
      withTimeout(outer, (signal) => categorize(withConsent ? facts : null, signal)),
      new Promise((r) => setTimeout(r, MIN_MS)),
    ]);
    if (outer.aborted) return;
    if (result.status === 'fulfilled') return continueToLearn();
    inFlight.current = false;
    setRetryable(isRetryable(result.reason));
    setPhase('error');
  };

  if (phase === 'consent') {
    if (check === 'failed') {
      return (
        <FlowPage
          testID="categorizing-check-error"
          center
          alert={alert}
          note="You'll start with the general lessons."
          footer={
            <>
              {retryable && <Button label="Retry" onPress={recheck} testID="categorizing-check-retry" />}
              <Button
                label="Skip for now"
                variant={retryable ? 'ghost' : 'primary'}
                onPress={continueToLearn}
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
            <Button label="Use my account data" onPress={() => void start(true)} testID="consent-accept" />
            <Button label="Continue without" variant="secondary" onPress={() => void start(false)} testID="consent-decline" />
          </>
        }
      >
        <ConsentCard facts={labels} />
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
      <FlowPage testID="categorizing-loading" center status={status}>
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
      alert={alert}
      note="You'll start with the general lessons."
      footer={
        <>
          {retryable && <Button label="Retry" onPress={() => void start(consent)} testID="categorizing-retry" />}
          <Button
            label="Skip for now"
            variant={retryable ? 'ghost' : 'primary'}
            onPress={continueToLearn}
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
}
