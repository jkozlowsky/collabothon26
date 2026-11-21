import { AREAS, CONFIDENCE, JUST_STARTING_BELOW, PROFILE_QUESTIONS, SOLID_ABOVE, SOLID_MIN_ANSWERS } from '@/constants/quickCheck';
import { api } from '@/lib/api';
import { groupThousands } from '@/lib/bank/money';
import { slotValues } from '@/lib/bank/selectors';
import { USER_ID } from '@/lib/user';
import type { BankState } from '@/types/bank';
import type { Facts, FocusArea } from '@/types/categorization';
import {
  SLOTS,
  type CheckQuestion,
  type HistoryEntry,
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
  return prompts && options && Array.isArray(q.slots);
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

export type StepBody = {
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

/** Per area, the mean of the chip values; "Not sure" counts as Guessing. The backend stores the same number. */
export function confidenceByArea(history: HistoryEntry[], pool: CheckQuestion[]) {
  const chip = (h: HistoryEntry) => CONFIDENCE.find((c) => c.value === (h.confidence ?? 'guessing'))!.chip;
  const sums: Partial<Record<FocusArea, number>> = {};
  const counts = answerCounts(history, pool);
  for (const h of history) {
    const area = areaOf(pool, h);
    if (area) sums[area] = (sums[area] ?? 0) + chip(h);
  }
  return Object.fromEntries(Object.entries(sums).map(([area, sum]) => [area, sum / counts[area as FocusArea]!]));
}

export type Level = 'none' | 'starting' | 'building' | 'solid';

/** Spec Q16 and D7: Solid needs a high mastery and at least two answers. */
export function levelOf(mastery: number | null | undefined, answers: number): Level {
  if (mastery == null) return 'none';
  if (mastery < JUST_STARTING_BELOW) return 'starting';
  return mastery > SOLID_ABOVE && answers >= SOLID_MIN_ANSWERS ? 'solid' : 'building';
}

/** The profile questions this run needs, in the spec's fixed order: age band only if life stage was skipped, cover only without consent. */
export const profileRequired = (consent: boolean, lifeStageSkipped: boolean) => {
  const needed = { ageBand: lifeStageSkipped, savingsCover: !consent, horizon: true };
  return PROFILE_QUESTIONS.filter((q) => needed[q.key]);
};

/** The required profile questions with no answer yet. */
export const profileToAsk = (profile: ProfileRanges, consent: boolean, lifeStageSkipped: boolean) =>
  profileRequired(consent, lifeStageSkipped).filter((q) => profile[q.key] === null);

export type AreaMark = { area: FocusArea; mastery: number | null; confidence: number | null; level: Level };

/** One entry per area for the dock and the summary; `fallbackAnswers` stands in for areas missing in `answers`. */
export function areaMarks(
  areas: FocusArea[],
  mastery: Mastery,
  confidence: Mastery,
  answers: Partial<Record<FocusArea, number>>,
  fallbackAnswers: number,
): AreaMark[] {
  return areas.map((area) => ({
    area,
    mastery: mastery[area] ?? null,
    confidence: confidence[area] ?? null,
    level: levelOf(mastery[area], answers[area] ?? fallbackAnswers),
  }));
}
