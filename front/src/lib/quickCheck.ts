import { AREAS, FEEDBACK, JUST_STARTING_BELOW, PROFILE_QUESTIONS, SOLID_ABOVE, SOLID_MIN_ANSWERS, type Feedback } from '@/constants/quickCheck';
import { api } from '@/lib/api';
import { parseDefinition } from '@/lib/glossaryMarkup';
import type { Facts, FocusArea } from '@/types/categorization';
import type { CheckQuestion, HistoryEntry, Horizon, Mastery, ProfileRanges, StepResponse } from '@/types/quickCheck';

const MIN_OPTIONS = 2;

function wellFormed(q: Partial<CheckQuestion> | null): q is CheckQuestion {
  if (!q || typeof q.id !== 'string' || !q.area || !AREAS.includes(q.area)) return false;
  const texts = typeof q.prompt === 'string' && typeof q.explanation === 'string' && typeof q.lessonId === 'string';
  const options = Array.isArray(q.options) && q.options.length >= MIN_OPTIONS && q.options.every((o) => typeof o === 'string');
  const correct = options && Number.isInteger(q.correctIndex) && q.correctIndex! >= 0 && q.correctIndex! < q.options!.length;
  return texts && correct;
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

const areaOf = (pool: CheckQuestion[], entry: HistoryEntry) => pool.find((q) => q.id === entry.questionId)?.area;

export function answerCounts(history: HistoryEntry[], pool: CheckQuestion[]) {
  const counts: Partial<Record<FocusArea, number>> = {};
  for (const h of history) {
    const area = areaOf(pool, h);
    if (area) counts[area] = (counts[area] ?? 0) + 1;
  }
  return counts;
}

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

/** The summary's "Saving for" line; a horizon of "Not sure" (or none) leaves only the purpose. */
export function savingForLine(purpose: string | null, horizon: Horizon | null) {
  if (!purpose) return undefined;
  const when = horizon && horizon !== 'not-sure' && PROFILE_QUESTIONS.horizon.options.find((o) => o.value === horizon)?.label;
  return `Saving for: ${purpose}${when ? ` · needed ${horizon === 'within-1y' ? '' : 'in '}${when.toLowerCase()}` : ''}`;
}

export type Level = 'none' | 'starting' | 'building' | 'solid';

/** Spec Q16 and D7: Solid needs a high mastery and at least two answers. */
export function levelOf(mastery: number | null | undefined, answers: number): Level {
  if (mastery == null) return 'none';
  if (mastery < JUST_STARTING_BELOW) return 'starting';
  return mastery > SOLID_ABOVE && answers >= SOLID_MIN_ANSWERS ? 'solid' : 'building';
}

export type AreaMark = { area: FocusArea; mastery: number | null; level: Level };

/** One entry per area for the summary; `fallbackAnswers` stands in for areas missing in `answers`. */
export function areaMarks(
  areas: FocusArea[],
  mastery: Mastery,
  answers: Partial<Record<FocusArea, number>>,
  fallbackAnswers = 0,
): AreaMark[] {
  return areas.map((area) => ({
    area,
    mastery: mastery[area] ?? null,
    level: levelOf(mastery[area], answers[area] ?? fallbackAnswers),
  }));
}
