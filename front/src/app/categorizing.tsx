import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Platform } from 'react-native';

import { ConsentCard } from '@/components/categorizing/ConsentCard';
import { FlowMessage } from '@/components/categorizing/FlowMessage';
import { FlowPage } from '@/components/categorizing/FlowPage';
import { LockedLessons } from '@/components/categorizing/LockedLessons';
import { PathSteps, type Step } from '@/components/categorizing/PathSteps';
import { QuickCheckPage } from '@/components/categorizing/QuickCheckPage';
import { Button } from '@/components/Button';
import { colors } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { continueToLearn } from '@/hooks/useOpenLearn';
import { categorize, existingCategorization, factLabels, factsFrom, isRetryable, withTimeout } from '@/lib/categorization';
import { openSummary, unseen } from '@/lib/learningPath';
import { drawQuestions, fetchCheckQuestions, promptParts, quizRng, toPayload, type Drawn } from '@/lib/quickCheck';
import type { CheckAnswer, CheckQuestion } from '@/types/quickCheck';

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

type Phase = 'consent' | 'quick' | 'loading' | 'error';

/** After a fresh onboarding: ask whether account data may be used, the Quick check, then build the learning path. */
export default function CategorizingScreen() {
  const { state: bank } = useBank();
  // Computed once per visit, so the facts sent are exactly the ones the card previewed.
  const [facts] = useState(() => factsFrom(bank));
  const labels = factLabels(facts);
  const [check, setCheck] = useState<'pending' | 'ask' | 'failed'>('pending');
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('consent');
  const [consent, setConsent] = useState(false);
  const [pool, setPool] = useState<CheckQuestion[]>([]);
  const [drawn, setDrawn] = useState<{ consent: boolean; items: Drawn[] } | null>(null);
  // The raw answer text lives only here, on this screen, until the one POST; null = "Not sure".
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [index, setIndex] = useState(0);
  const sent = useRef<CheckAnswer[]>([]);
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
    withTimeout(ctrl.signal, async (signal) => {
      const existing = await existingCategorization(signal);
      return { existing, pool: existing ? [] : await fetchCheckQuestions(signal) };
    }).then(
      ({ existing, pool }) => {
        if (ctrl.signal.aborted) return;
        if (!existing) {
          setPool(pool);
          setCheck('ask');
        } else if (unseen(existing)) openSummary(existing, false);
        else continueToLearn();
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

  const start = async (withConsent: boolean, checkAnswers: CheckAnswer[]) => {
    const outer = visit.current?.signal;
    if (inFlight.current || !outer) return;
    inFlight.current = true;
    sent.current = checkAnswers;
    setConsent(withConsent);
    setStep(0);
    setPhase('loading');
    const [result] = await Promise.allSettled([
      withTimeout(outer, (signal) => categorize(withConsent ? facts : null, signal, checkAnswers)),
      new Promise((r) => setTimeout(r, MIN_MS)),
    ]);
    if (outer.aborted) return;
    if (result.status === 'fulfilled') return openSummary(result.value, checkAnswers.length > 0);
    inFlight.current = false;
    setRetryable(isRetryable(result.reason));
    setPhase('error');
  };

  /** Consent given or declined: draw the questions (or skip them) and move on. */
  const decide = (withConsent: boolean) => {
    const items = drawn?.consent === withConsent ? drawn.items : drawQuestions(pool, bank, withConsent, quizRng());
    if (!items.length) return void start(withConsent, []);
    if (drawn?.consent !== withConsent) {
      setDrawn({ consent: withConsent, items });
      setAnswers([]);
    }
    setConsent(withConsent);
    setIndex(0);
    setPhase('quick');
  };

  if (phase === 'quick' && drawn) {
    const item = drawn.items[index];
    const answer = (text: string | null) => {
      const next = answers.slice();
      next[index] = text;
      setAnswers(next);
      if (index < drawn.items.length - 1) setIndex(index + 1);
      else void start(consent, toPayload(drawn.items, next));
    };
    return (
      <QuickCheckPage
        key={index}
        index={index}
        total={drawn.items.length}
        parts={promptParts(item, bank)}
        account={item.account}
        initial={answers[index] ?? ''}
        onNext={answer}
        onUnsure={() => answer(null)}
        onBack={() => (index > 0 ? setIndex(index - 1) : setPhase('consent'))}
      />
    );
  }

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
            <Button label="Continue without" variant="secondary" onPress={() => decide(false)} testID="consent-decline" />
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
          {retryable && <Button label="Retry" onPress={() => void start(consent, sent.current)} testID="categorizing-retry" />}
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
}
