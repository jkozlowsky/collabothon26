import { AREAS, FEEDBACK, JUST_STARTING_BELOW, PROFILE_QUESTIONS, SOLID_ABOVE, SOLID_MIN_ANSWERS, type Feedback } from '@/constants/quickCheck';
import { api } from '@/lib/api';
import { groupThousands } from '@/lib/bank/money';
import { slotValues } from '@/lib/bank/selectors';
import { USER_ID } from '@/lib/user';
import type { BankState } from '@/types/bank';
import type { Facts, FocusArea } from '@/types/categorization';
import {
  SLOTS,
  type CheckQuestion,
  type Confidence,
  type ConfidenceRating,
  type HistoryEntry,
  type Horizon,
  type Mastery,
  type ProfileRanges,
  type Slot,
  type StepResponse,
} from '@/types/quickCheck';

const MIN_POSITIONS = 2;
const MIN_OPTIONS = 2;

const isSlot = (name: string): name is Slot => (SLOTS as readonly string[]).includes(name);

function wellFormed(q: Partial<CheckQuestion> | null): q is CheckQuestion {
  if (!q || typeof q.id !== 'string' || !q.area || !AREAS.includes(q.area)) return false;
  const prompts = typeof q.genericPrompt === 'string' && (q.accountPrompt === null || typeof q.accountPrompt === 'string');
  const options = Array.isArray(q.options) && q.options.length >= MIN_OPTIONS && q.options.every((o) => typeof o === 'string');
  const correct = options && Number.isInteger(q.correctIndex) && q.correctIndex! >= 0 && q.correctIndex! < q.options!.length;
  return prompts && correct && Array.isArray(q.slots);
}

/** A failed GET counts as no questions and an unusable item as no item; an empty bank skips the Quick check. */
export async function fetchCheckQuestions(signal: AbortSignal): Promise<CheckQuestion[]> {
  try {
    const bank = await api<Partial<CheckQuestion>[]>('/api/check-questions', { signal });
    if (!Array.isArray(bank)) return [];
    const usable = bank.filter(wellFormed);
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

export const postStep = (body: StepBody, signal: AbortSignal) =>
  api<StepResponse>(`/api/users/${encodeURIComponent(USER_ID)}/quick-check/step`, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });

function available(slot: Slot, bank: BankState) {
  const value = slotValues(bank)[slot];
  return slot === 'positionCount' ? value >= MIN_POSITIONS : value > 0;
}

/** The account version needs consent and every slot it quotes, each one declared in `slots` and filled. */
export function accountUsable(q: CheckQuestion, bank: BankState, consent: boolean) {
  if (!consent || q.accountPrompt === null) return false;
  const quoted = [...q.accountPrompt.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  const declared = quoted.every((name) => isSlot(name) && q.slots.includes(name));
  const filled = q.slots.every((name) => isSlot(name) && available(name, bank));
  return declared && filled;
}

type Part = { text: string; filled: boolean };

/** The prompt in pieces, so the numbers taken from the account can be highlighted. */
export function promptParts(question: CheckQuestion, bank: BankState, account: boolean): Part[] {
  if (!account) return [{ text: question.genericPrompt, filled: false }];
  const values = slotValues(bank);
  // Splitting on a capture group puts the slot names at the odd indexes.
  const pieces = question.accountPrompt!.split(/\{(\w+)\}/);
  const parts = pieces.map((text, i): Part => {
    const isSlot = i % 2 === 1;
    return isSlot ? { text: groupThousands(values[text as Slot]), filled: true } : { text, filled: false };
  });
  return parts.filter((part) => part.text);
}

const areaOf = (pool: CheckQuestion[], entry: HistoryEntry) => pool.find((q) => q.id === entry.questionId)?.area;

export function answerCounts(history: HistoryEntry[], pool: CheckQuestion[]) {
  const counts: Partial<Record<FocusArea, number>> = {};
  for (const h of history) {
    const area = areaOf(pool, h);
    if (area) counts[area] = (counts[area] ?? 0) + 1;
  }
  return counts;
}

/** The 1–5 self-rating as the contract's confidence: every answered option carries it. */
export const confidenceOf = (rating: ConfidenceRating): Confidence =>
  rating <= 2 ? 'guessing' : rating === 3 ? 'fairly-sure' : 'sure';

/** `picked` null = "Not sure". */
export function feedbackFor(picked: number | null, correctIndex: number, rating: ConfidenceRating): Feedback {
  if (picked === null) return FEEDBACK.unsure;
  if (picked === correctIndex) return rating <= 2 ? FEEDBACK.rightLow : FEEDBACK.right;
  return rating >= 4 ? FEEDBACK.wrongHigh : FEEDBACK.wrong;
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

export type AreaMark = { area: FocusArea; mastery: number | null; confidence: number | null; level: Level };

/** One entry per area for the summary; `fallbackAnswers` stands in for areas missing in `answers`. */
export function areaMarks(
  areas: FocusArea[],
  mastery: Mastery,
  confidence: Mastery,
  answers: Partial<Record<FocusArea, number>>,
  fallbackAnswers = 0,
): AreaMark[] {
  return areas.map((area) => ({
    area,
    mastery: mastery[area] ?? null,
    confidence: confidence[area] ?? null,
    level: levelOf(mastery[area], answers[area] ?? fallbackAnswers),
  }));
}
