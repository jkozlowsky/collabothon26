import { useCallback, useEffect, useRef, useState } from 'react';

import { accountUsable, drawQuestions, promptParts, quizRng, toAnswer } from '@/lib/quickCheck';
import type { BankState } from '@/types/bank';
import type { CheckAnswer, CheckQuestion, Drawn } from '@/types/quickCheck';

/** Next and "Not sure" stay disabled this long after a question appears, so a double tap cannot skip one unseen. */
export const ANSWER_DELAY_MS = 400;

/** `shown` counts how often a question has appeared, so every appearance gets its own delay. */
type Run = { items: Drawn[]; index: number; draft: string; shown: number };

const hasAnswer = (d: Drawn) => d.answer !== undefined && d.answer !== '';

/**
 * The Quick check's state: the drawn questions, the answer kept on each, the current question and its draft. The raw
 * answer text lives only here until the one POST. `consent` decides which questions quote the account.
 */
export function useQuickCheck(pool: CheckQuestion[], bank: BankState, consent: boolean) {
  const [run, setRun] = useState<Run | null>(null);
  const shows = useRef(0);
  const showing = (items: Drawn[], index: number): Run => ({
    items,
    index,
    draft: items[index].answer ?? '',
    shown: ++shows.current,
  });
  // The appearance whose delay has run out; any other one is not ready yet.
  const [readyShown, setReadyShown] = useState(0);
  const shown = run?.shown;

  useEffect(() => {
    if (shown === undefined) return;
    const id = setTimeout(() => setReadyShown(shown), ANSWER_DELAY_MS);
    return () => clearTimeout(id);
  }, [shown]);

  /**
   * Starts at the first question. Earlier answers keep their questions; before any answer a new consent draws again,
   * so accepting after declining gets the account versions. False when there is nothing to ask.
   */
  const begin = (withConsent: boolean) => {
    const keep = run !== null && run.items.some(hasAnswer);
    const items = keep ? run.items : drawQuestions(pool, bank, withConsent, quizRng());
    if (!items.length) return false;
    setRun(showing(items, 0));
    return true;
  };

  /** Records the answer and moves on; after the last question it returns every answer, ready to send. */
  const answer = (text: string | null): CheckAnswer[] | null => {
    if (!run) return null;
    const items = run.items.map((d, i) => (i === run.index ? { ...d, answer: text } : d));
    if (run.index < items.length - 1) {
      setRun(showing(items, run.index + 1));
      return null;
    }
    setRun({ ...run, items });
    return items.map(toAnswer);
  };

  /** Keeps the draft and steps back; true when it left the questions for the consent card. */
  const back = useCallback(() => {
    if (!run) return true;
    const items = run.items.map((d, i) => (i === run.index ? { ...d, answer: run.draft || d.answer } : d));
    if (run.index === 0) {
      setRun({ ...run, items });
      return true;
    }
    setRun(showing(items, run.index - 1));
    return false;
  }, [run]);

  const setDraft = (draft: string) => setRun((r) => r && { ...r, draft });

  if (!run) return { view: null, begin, answer, back, setDraft };
  const { question } = run.items[run.index];
  const account = accountUsable(question, bank, consent);
  const view = {
    index: run.index,
    total: run.items.length,
    account,
    parts: promptParts(question, bank, account),
    draft: run.draft,
    ready: readyShown === run.shown,
  };
  return { view, begin, answer, back, setDraft };
}
