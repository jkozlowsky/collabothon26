import { useEffect, useRef, useState } from 'react';

import { AREA_LABEL, DONE_MS, MAX_QUESTIONS, STEP_TIMEOUT_MS, type Feedback } from '@/constants/quickCheck';
import { accountUsable, confidenceOf, feedbackFor, postStep, promptParts } from '@/lib/quickCheck';
import type { BankState } from '@/types/bank';
import type { Facts, FocusArea } from '@/types/categorization';
import type {
  CheckQuestion,
  ConfidenceRating,
  HistoryEntry,
  Mastery,
  ProfileRanges,
  QuickResult,
  StepResponse,
} from '@/types/quickCheck';

export type QuestionView = {
  /** Changes with every question, so the screen can start it fresh. */
  key: string;
  area: FocusArea;
  prompt: string;
  /** The prompt in pieces; `filled` ones come from the user's account. */
  parts: { text: string; filled: boolean }[];
  options: string[];
  why: string;
  /** The question quotes the account, so the slip line says the numbers stay on the phone. */
  account: boolean;
  correctIndex: number;
  /** Set once the answer is committed: the pick (null = "Not sure") and what to say about it. */
  result: { picked: number | null; feedback: Feedback } | null;
};

/** `first`: the first step runs. `answered`: the reveal is on screen. `waiting`: "Continue" came before the step's answer. */
type Stage = 'idle' | 'first' | 'question' | 'answered' | 'waiting' | 'done';

/** What a step decided: the next question, the end of the test, or a failure that ends it with the history so far. */
type Outcome = { next: string } | 'done' | 'failed';

type Run = {
  stage: Stage;
  /** The question bank this test draws from. */
  pool: CheckQuestion[];
  history: HistoryEntry[];
  mastery: Mastery;
  currentId: string | null;
  /** The answered question's step has decided, and waits for "Continue". */
  outcome: Outcome | null;
  /** No model at all (no key): the backend said so, and the final POST repeats it. */
  useRules: boolean;
  /** A step's model call failed: the rest of the steps run on the rule, the final call still runs. */
  fellBack: boolean;
  /** Steps sent as a model call (`useRules: false` with a history), counted for `stepCallsMade`. */
  calls: number;
};

const INITIAL: Run = { stage: 'idle', pool: [], history: [], mastery: {}, currentId: null, outcome: null, useRules: false, fellBack: false, calls: 0 };
const RUNNING: Stage[] = ['first', 'answered', 'waiting'];

type Props = {
  bank: BankState;
  consent: boolean;
  /** Sent with every step when `consent`. */
  facts: Facts | null;
  /** The ranges and the self-rating the survey collected. */
  profile: ProfileRanges;
  rating: ConfidenceRating;
  /** The test ended (done, or a step failed twice): send the final POST. */
  onFinish: (result: QuickResult) => void;
  /** The first step failed: the Quick check is skipped and F1 applies. */
  onSkip: () => void;
};

/**
 * The Quick check's state machine: one Jev-or-rule step per answer, started at the tap and applied at "Continue"
 * (docs/specs/F1b-quick-check.md, "Front flow and errors"). The raw history lives only here until the final POST.
 */
export function useQuickCheck({ bank, consent, facts, profile, rating, onFinish, onSkip }: Props) {
  const [run, setRun] = useState(INITIAL);
  // Async steps read the latest run here: a response is applied only while the history it was sent with is still current.
  const latest = useRef(INITIAL);
  const update = (patch: Partial<Run>) => {
    latest.current = { ...latest.current, ...patch };
    setRun(latest.current);
  };
  const request = useRef<AbortController | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = () => {
    clearTimeout(doneTimer.current);
    request.current?.abort();
  };
  useEffect(() => stop, []);

  const stale = (history: HistoryEntry[]) =>
    !RUNNING.includes(latest.current.stage) || latest.current.history.length !== history.length;

  const send = async (history: HistoryEntry[], useRules: boolean, stepFellBack: boolean): Promise<StepResponse> => {
    const ctrl = new AbortController();
    request.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), STEP_TIMEOUT_MS);
    try {
      return await postStep({ consent, ...(consent && { facts }), profile, history, useRules, stepFellBack }, ctrl.signal);
    } finally {
      clearTimeout(timer);
    }
  };

  const finish = () => {
    const { history, mastery, useRules, calls } = latest.current;
    update({ stage: 'idle' });
    onFinish({ profile, history, mastery, useRules, stepCallsMade: calls });
  };

  const apply = (outcome: Outcome) => {
    if (outcome === 'failed') return finish();
    if (outcome === 'done') {
      update({ stage: 'done', outcome: null });
      doneTimer.current = setTimeout(finish, DONE_MS);
      return;
    }
    update({ stage: 'question', currentId: outcome.next, outcome: null });
  };

  /** One step for `history`; a failure retries once with `stepFellBack`, a second failure ends the test (the first step skips it). */
  const step = async (history: HistoryEntry[]) => {
    const first = history.length === 0;
    let { calls, useRules, fellBack } = latest.current;
    let result: StepResponse | null = null;
    for (const fallback of useRules || fellBack ? [fellBack] : [false, true]) {
      if (!useRules && !fallback && !first) calls++;
      try {
        result = await send(history, useRules, fallback);
        fellBack = fallback || result.stepFellBack;
        useRules = result.useRules;
        break;
      } catch {
        if (stale(history) || first) break;
      }
    }
    if (stale(history)) return;
    const next = latest.current.pool.find((q) => q.id === result?.nextQuestionId);
    const outcome: Outcome = !result || (!result.done && !next) ? 'failed' : result.done ? 'done' : { next: next!.id };
    if (outcome === 'failed' && first) {
      update({ stage: 'idle' });
      return onSkip();
    }
    update({ calls, ...(result && outcome !== 'failed' && { mastery: result.mastery, useRules, fellBack }) });
    // While the reveal is on screen the outcome waits for "Continue".
    if (latest.current.stage === 'answered') update({ outcome });
    else apply(outcome);
  };

  const begin = (pool: CheckQuestion[]) => {
    stop();
    update({ ...INITIAL, pool, stage: 'first' });
    void step([]);
  };

  /** Leaves the test: nothing in flight survives. */
  const close = () => {
    stop();
    update(INITIAL);
  };

  /** Commits the answer and shows the right one at once; its step runs while the user reads. `optionIndex` null = "Not sure". */
  const answer = (optionIndex: number | null) => {
    const { stage, history, currentId } = latest.current;
    if (stage !== 'question' || !currentId) return;
    const confidence = optionIndex === null ? null : confidenceOf(rating);
    const answered = [...history, { questionId: currentId, optionIndex, confidence }];
    update({ stage: 'answered', history: answered, outcome: null });
    void step(answered);
  };

  /** "Continue": on to what the step decided, or to the status line until it has. */
  const proceed = () => {
    const { stage, outcome } = latest.current;
    if (stage !== 'answered') return;
    if (outcome) apply(outcome);
    else update({ stage: 'waiting' });
  };

  const { stage, pool, history, currentId } = run;
  const answered = stage === 'answered';
  const question = stage === 'question' || answered ? (pool.find((q) => q.id === currentId) ?? null) : null;
  const before = answered ? history.slice(0, -1) : history;
  const picked = answered ? history.at(-1)!.optionIndex : null;
  const account = !!question && accountUsable(question, bank, consent);
  const parts = question ? promptParts(question, bank, account) : [];
  const seenAreaBefore = !!question && before.some((h) => pool.find((q) => q.id === h.questionId)?.area === question.area);

  const view: QuestionView | null = question && {
    key: `${before.length}-${question.id}`,
    area: question.area,
    prompt: parts.map((p) => p.text).join(''),
    parts,
    options: question.options,
    why: seenAreaBefore
      ? `Picked to look at ${AREA_LABEL[question.area]} from another angle`
      : `Picked to learn more about ${AREA_LABEL[question.area]}`,
    account,
    correctIndex: question.correctIndex,
    result: answered ? { picked, feedback: feedbackFor(picked, question.correctIndex, rating) } : null,
  };

  const status: 'waiting' | 'done' | null = stage === 'first' || stage === 'waiting' ? 'waiting' : stage === 'done' ? 'done' : null;
  return {
    view,
    /** The line shown in place of the question while a step decides or the test is done. */
    status,
    /** "Question {position} of up to {total}": the shown question, or the last answered one under a status line. */
    position: stage === 'question' ? history.length + 1 : Math.max(1, history.length),
    total: MAX_QUESTIONS,
    begin,
    answer,
    proceed,
    close,
  };
}
