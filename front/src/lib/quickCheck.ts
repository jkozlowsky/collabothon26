import { api } from '@/lib/api';
import { createRng } from '@/lib/bank/seed';
import { groupThousands } from '@/lib/bank/money';
import { slotValues } from '@/lib/bank/selectors';
import type { BankState } from '@/types/bank';
import type { CheckAnswer, CheckQuestion, Drawn, Slot } from '@/types/quickCheck';

const CATEGORIES = ['finance', 'investing'] as const;
const AREAS_PER_CATEGORY = 2;
const MAX_INFLATION_RATE = 3;
const MIN_POSITIONS = 2;

/** A failed or malformed GET counts as an empty pool, which skips the Quick check. */
export async function fetchCheckQuestions(signal: AbortSignal): Promise<CheckQuestion[]> {
  try {
    const pool = await api<CheckQuestion[]>('/api/check-questions', { signal });
    return Array.isArray(pool) ? pool : [];
  } catch {
    return [];
  }
}

/** A numeric EXPO_PUBLIC_QUIZ_SEED repeats the draw for a rehearsed demo; dev builds only. */
export function quizRng(seed = process.env.EXPO_PUBLIC_QUIZ_SEED, dev = __DEV__) {
  const n = Number(seed);
  return dev && seed?.trim() && Number.isFinite(n) ? createRng(n) : Math.random;
}

const available = (slot: Slot, bank: BankState) =>
  slotValues(bank)[slot] > (slot === 'positionCount' ? MIN_POSITIONS - 1 : 0);

export const accountUsable = (q: CheckQuestion, bank: BankState, consent: boolean) =>
  consent &&
  q.accountPrompt !== null &&
  q.slots.every((s) => available(s, bank)) &&
  (q.id !== 'rate-vs-inflation' || slotValues(bank).savingsInterestRate < MAX_INFLATION_RATE);

/**
 * Two areas from each category, one question per area, finance first. Within an area a question whose account
 * version is usable wins. A category with fewer than two areas skips the whole Quick check.
 */
export function drawQuestions(pool: CheckQuestion[], bank: BankState, consent: boolean, rng: () => number): Drawn[] {
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const pickFrom = <T>(items: T[]) => items[Math.floor(rng() * items.length)];
  const drawn: Drawn[] = [];
  for (const category of CATEGORIES) {
    const byArea = new Map<string, CheckQuestion[]>();
    for (const q of sorted) if (q.category === category) byArea.set(q.area, [...(byArea.get(q.area) ?? []), q]);
    const areas = [...byArea.keys()];
    if (areas.length < AREAS_PER_CATEGORY) return [];
    for (let i = 0; i < AREAS_PER_CATEGORY; i++) {
      const area = areas.splice(Math.floor(rng() * areas.length), 1)[0];
      const candidates = byArea.get(area)!;
      const usable = candidates.filter((q) => accountUsable(q, bank, consent));
      const question = pickFrom(usable.length ? usable : candidates);
      drawn.push({ question });
    }
  }
  return drawn;
}

/** The prompt in pieces, so the numbers taken from the account can be highlighted. */
export function promptParts(
  question: CheckQuestion,
  bank: BankState,
  account: boolean,
): { text: string; filled: boolean }[] {
  if (!account) return [{ text: question.genericPrompt, filled: false }];
  const values = slotValues(bank);
  // Splitting on a capture group puts the slot names at the odd indexes.
  return question
    .accountPrompt!.split(/\{(\w+)\}/)
    .map((text, i) => (i % 2 ? { text: groupThousands(values[text as Slot]), filled: true } : { text, filled: false }))
    .filter((p) => p.text);
}

export const toAnswer = ({ question, answer }: Drawn): CheckAnswer => ({ questionId: question.id, text: answer ?? null });
