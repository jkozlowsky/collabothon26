import { useEffect, useRef, useState } from 'react';

import { ANSWER_DELAY_MS, AREAS, AREA_LABEL, DONE_MS, MAX_QUESTIONS, STEP_TIMEOUT_MS } from '@/constants/quickCheck';
import {
  accountUsable,
  answerCounts,
  areaMarks,
  confidenceByArea,
  postStep,
  profileRequired,
  profileToAsk,
  promptParts,
} from '@/lib/quickCheck';
import type { BankState } from '@/types/bank';
import type { Facts } from '@/types/categorization';
import { personaFor } from '@/lib/personas';
import { useCurrentUser } from '@/lib/user';
import type {
  CheckQuestion,
  Confidence,
  HistoryEntry,
  Mastery,
  ProfileRanges,
  QuickResult,
  StepResponse,
} from '@/types/quickCheck';

export type QuestionView = {
  /** Changes with every question, so the screen can start it fresh. */
  key: string;
  kind: 'profile' | 'knowledge';
  prompt: string;
  /** The prompt in pieces; `filled` ones come from the user's account. */
  parts: { text: string; filled: boolean }[];
  options: string[];
  why: string;
  /** The question quotes the account, so the slip line says the numbers stay on the phone. */
  account: boolean;
  preselectedOptionIndex?: number;
};

type Stage = 'idle' | 'profile' | 'knowledge' | 'waiting' | 'done';

type Run = {
  stage: Stage;
  profile: ProfileRanges;
  history: HistoryEntry[];
  mastery: Mastery;
  /** The knowledge question on screen; still the answered one while its step runs. */
  currentId: string | null;
  /** No model at all: the user's opt-out, or no key. Goes to the final POST. */
  useRules: boolean;
  /** A step's model call failed: the rest of the steps run on the rule, the final call still runs. */
  fellBack: boolean;
  /** Steps sent as a model call (`useRules: false` with a history), counted for `stepCallsMade`. */
  calls: number;
};

const EMPTY_PROFILE: ProfileRanges = { ageBand: null, savingsCover: null, horizon: null };
const INITIAL: Run = { stage: 'idle', profile: EMPTY_PROFILE, history: [], mastery: {}, currentId: null, useRules: false, fellBack: false, calls: 0 };

type Props = {
  pool: CheckQuestion[];
  bank: BankState;
  consent: boolean;
  /** Sent with every step when `consent`. */
  facts: Facts | null;
  lifeStageSkipped: boolean;
  /** The test ended (done, or a step failed twice): send the final POST. */
  onFinish: (result: QuickResult) => void;
  /** The first step failed: the Quick check is skipped and F1 applies; `useRules` after an opt-out, `calls` the model calls made before a restart. */
  onSkip: (useRules: boolean, calls: number) => void;
};

/**
 * The Quick check's state machine: the profile tiles, then one Jev-or-rule step per knowledge answer (docs/specs/F1b-quick-check.md,
 * "Front flow and errors"). The raw history lives only here until the final POST.
 */
export function useQuickCheck({ pool, bank, consent, facts, lifeStageSkipped, onFinish, onSkip }: Props) {
  const { userId } = useCurrentUser();
  const hints = personaFor(userId).hints;
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
    latest.current.stage !== 'waiting' || latest.current.history.length !== history.length;

  const send = async (history: HistoryEntry[], useRules: boolean, stepFellBack: boolean): Promise<StepResponse> => {
    const ctrl = new AbortController();
    request.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), STEP_TIMEOUT_MS);
    try {
      const body = { consent, ...(consent && { facts }), profile: latest.current.profile, history, useRules, stepFellBack };
      return await postStep(body, ctrl.signal, userId);
    } finally {
      clearTimeout(timer);
    }
  };

  const finish = () => {
    const { profile, history, mastery, useRules, calls } = latest.current;
    update({ stage: 'idle' });
    onFinish({ profile, history, mastery, useRules, stepCallsMade: calls });
  };

  /** One step for `history`; a failure retries once with `stepFellBack`, a second failure ends the test (the first step skips it). */
  const step = async (history: HistoryEntry[]) => {
    update({ stage: 'waiting', history });
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
    const next = pool.find((q) => q.id === result?.nextQuestionId);
    if (!result || (!result.done && !next)) {
      update({ calls });
      if (!first) return finish();
      update({ stage: 'idle' });
      return onSkip(useRules, calls);
    }
    update({ mastery: result.mastery, useRules, fellBack, calls, currentId: next?.id ?? latest.current.currentId });
    if (!result.done) return update({ stage: 'knowledge' });
    update({ stage: 'done' });
    doneTimer.current = setTimeout(finish, DONE_MS);
  };

  const advance = (profile: ProfileRanges) => {
    if (profileToAsk(profile, consent, lifeStageSkipped).length) return update({ stage: 'profile', profile });
    update({ profile });
    void step([]);
  };

  /** Starts (or restarts, D3) with an empty knowledge history; the profile answers are kept. */
  const begin = (useRules = false) => {
    stop();
    // Turning account access on drops the savings cover (it is only asked without consent).
    const kept = latest.current.profile;
    latest.current = { ...INITIAL, useRules, calls: latest.current.calls };
    advance(consent ? { ...kept, savingsCover: null } : kept);
  };

  /** Back to the "What we know" card: nothing in flight survives, the profile answers do. */
  const back = () => {
    stop();
    update({ ...INITIAL, profile: latest.current.profile, calls: latest.current.calls });
  };

  const answer = (optionIndex: number | null, confidence: Confidence | null = null) => {
    const { stage, profile, history, currentId } = latest.current;
    if (stage === 'profile') {
      const asked = profileToAsk(profile, consent, lifeStageSkipped)[0];
      advance({ ...profile, [asked.key]: asked.options[optionIndex!].value });
    } else if (stage === 'knowledge') {
      void step([...history, { questionId: currentId!, optionIndex, confidence }]);
    }
  };

  const { stage, profile, history, mastery, currentId } = run;
  const asked = stage === 'profile' ? profileToAsk(profile, consent, lifeStageSkipped)[0] : null;
  const question = stage === 'idle' || stage === 'profile' ? null : (pool.find((q) => q.id === currentId) ?? null);
  const key = asked ? `profile-${asked.key}` : `question-${currentId}`;
  const [readyKey, setReadyKey] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setReadyKey(key), ANSWER_DELAY_MS);
    return () => clearTimeout(id);
  }, [key]);

  const required = profileRequired(consent, lifeStageSkipped);
  const answered = required.filter((q) => profile[q.key] !== null).length + history.length;
  const atQuestion = stage === 'profile' || stage === 'knowledge';
  const account = !!question && accountUsable(question, bank, consent);
  const parts = question ? promptParts(question, bank, account) : [];
  const seenAreaBefore = !!question && history.slice(0, atQuestion ? undefined : -1).some((h) => pool.find((q) => q.id === h.questionId)?.area === question.area);

  const hintedVal = asked && hints ? hints[asked.key] : undefined;
  const preselectedOptionIndex =
    asked && hintedVal !== undefined ? asked.options.findIndex((o) => o.value === hintedVal) : undefined;

  const view: QuestionView | null = asked
    ? {
        key,
        kind: 'profile',
        prompt: asked.prompt,
        parts: [{ text: asked.prompt, filled: false }],
        options: asked.options.map((o) => o.label),
        why: asked.why,
        account: false,
        preselectedOptionIndex: preselectedOptionIndex !== undefined && preselectedOptionIndex !== -1 ? preselectedOptionIndex : undefined,
      }
    : question && {
        key,
        kind: 'knowledge',
        prompt: parts.map((p) => p.text).join(''),
        parts,
        options: question.options,
        why: seenAreaBefore
          ? `Picked to look at ${AREA_LABEL[question.area]} from another angle`
          : `Picked to learn more about ${AREA_LABEL[question.area]}`,
        account,
      };

  const areas = AREAS.filter((area) => pool.some((q) => q.area === area));
  return {
    stage,
    view,
    ready: atQuestion && readyKey === key,
    /** "Question {position} of up to {total}": the shown question, which is the answered one while its step runs. */
    position: Math.max(1, atQuestion ? answered + 1 : answered),
    total: MAX_QUESTIONS + required.length,
    dock: areaMarks(areas, mastery, confidenceByArea(history, pool), answerCounts(history, pool)),
    begin,
    answer,
    back,
  };
}
