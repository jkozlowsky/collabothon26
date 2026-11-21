import { useCallback, useRef, useState } from 'react';

import { accountUsable, drawQuestions, promptParts, quizRng, toAnswer } from '@/lib/quickCheck';
import type { BankState } from '@/types/bank';
import type { CheckAnswer, CheckQuestion, Drawn } from '@/types/quickCheck';

/** "Not sure" is ignored this long after a question appears, so a double tap cannot skip one unseen. */
const NOT_SURE_GUARD_MS = 400;

type Run = { consent: boolean; items: Drawn[]; index: number; draft: string };

const showing = (consent: boolean, items: Drawn[], index: number): Run => ({
  consent,
  items,
  index,
  draft: items[index].answer ?? '',
});

/**
 * The Quick check's state: the drawn questions, the answer kept on each, the current question and its draft. The raw
 * answer text lives only here until the one POST.
 */
export function useQuickCheck(pool: CheckQuestion[], bank: BankState) {
  const [run, setRun] = useState<Run | null>(null);
  const shownAt = useRef(0);
  const show = useCallback((consent: boolean, items: Drawn[], index: number) => {
    shownAt.current = Date.now();
    setRun(showing(consent, items, index));
  }, []);

  /** Starts at the first question, keeping the questions and answers of an earlier start; false when there are none. */
  const begin = (consent: boolean) => {
    const items = run?.items ?? drawQuestions(pool, bank, consent, quizRng());
    if (!items.length) return false;
    show(consent, items, 0);
    return true;
  };

  /** Records the answer and moves on; after the last question it returns every answer, ready to send. */
  const answer = (text: string | null): CheckAnswer[] | null => {
    if (!run) return null;
    if (text === null && Date.now() - shownAt.current < NOT_SURE_GUARD_MS) return null;
    const items = run.items.map((d, i) => (i === run.index ? { ...d, answer: text } : d));
    if (run.index < items.length - 1) {
      show(run.consent, items, run.index + 1);
      return null;
    }
    setRun({ ...run, items });
    return items.map(toAnswer);
  };

  /** Keeps the draft and steps back; true when it left the questions for the consent card. */
  const back = useCallback(() => {
    if (!run) return true;
    const items = run.items.map((d, i) => (i === run.index ? { ...d, answer: run.draft } : d));
    if (run.index === 0) {
      setRun({ ...run, items });
      return true;
    }
    show(run.consent, items, run.index - 1);
    return false;
  }, [run, show]);

  const setDraft = (draft: string) => setRun((r) => r && { ...r, draft });

  if (!run) return { view: null, begin, answer, back, setDraft };
  const { question } = run.items[run.index];
  const account = accountUsable(question, bank, run.consent);
  const view = {
    index: run.index,
    total: run.items.length,
    account,
    parts: promptParts(question, bank, account),
    draft: run.draft,
  };
  return { view, begin, answer, back, setDraft };
}
