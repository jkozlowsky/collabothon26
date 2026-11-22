import { AREAS, FEEDBACK, type Feedback } from '@/constants/quickCheck';
import { api } from '@/lib/api';
import { parseDefinition } from '@/lib/glossaryMarkup';
import type { Facts } from '@/types/categorization';
import type { CheckQuestion, HistoryEntry, ProfileRanges, StepResponse } from '@/types/quickCheck';

const MIN_OPTIONS = 2;

function wellFormed(q: Partial<CheckQuestion> | null): q is CheckQuestion {
  if (!q || typeof q.id !== 'string' || !q.area || !AREAS.includes(q.area)) return false;
  const { options, correctIndex } = q;
  if (typeof q.prompt !== 'string' || typeof q.explanation !== 'string' || typeof q.lessonId !== 'string') return false;
  if (!Array.isArray(options) || options.length < MIN_OPTIONS || !options.every((o) => typeof o === 'string')) return false;
  return typeof correctIndex === 'number' && Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < options.length;
}

/** A failed GET counts as no questions and an unusable item as no item; an empty list skips the Quick check. */
export async function fetchCheckQuestions(signal: AbortSignal): Promise<CheckQuestion[]> {
  try {
    const questions = await api<Partial<CheckQuestion>[]>('/api/check-questions', { signal });
    if (!Array.isArray(questions)) return [];
    const usable = questions.filter(wellFormed);
    // A repeated id would be sent twice and rejected, so the first item of an id wins.
    return usable.filter((q, i) => usable.findIndex((other) => other.id === q.id) === i);
  } catch {
    return [];
  }
}

type StepBody = {
  consent: boolean;
  facts?: Facts | null;
  profile: ProfileRanges;
  history: HistoryEntry[];
  useRules: boolean;
  stepFellBack: boolean;
};

export const postStep = (body: StepBody, signal: AbortSignal, userId: string = 'demo-user') =>
  api<StepResponse>(`/api/users/${encodeURIComponent(userId)}/quick-check/step`, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });

/**
 * The test has no lesson glossary to open, so a [[concept|shown text]] marker reads as its plain label
 * ([[concept]] alone as the concept's words).
 */
export const plainText = (marked: string) =>
  parseDefinition(marked)
    .map((s) => (s.type === 'text' ? s.value : s.label === s.slug ? s.slug.replace(/-/g, ' ') : s.label))
    .join('');

/** What the banner says after an answer: how it went, then the lesson's own explanation. `picked` null = "Not sure". */
export function feedbackFor(picked: number | null, question: CheckQuestion): Feedback {
  const tone = picked === null ? FEEDBACK.unsure : picked === question.correctIndex ? FEEDBACK.right : FEEDBACK.wrong;
  return { ...tone, body: plainText(question.explanation) };
}
