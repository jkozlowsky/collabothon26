import { api } from '@/lib/api';
import { groupThousands } from '@/lib/bank/money';
import { createRng } from '@/lib/bank/seed';
import { slotValues } from '@/lib/bank/selectors';
import type { BankState } from '@/types/bank';
import type { FocusArea } from '@/types/categorization';
import { SLOTS, type CheckAnswer, type CheckQuestion, type Drawn, type Slot } from '@/types/quickCheck';

/** The areas of each category, in the order the draw looks at them. */
const AREAS: Record<CheckQuestion['category'], FocusArea[]> = {
  finance: ['saving', 'debt'],
  investing: ['investing', 'risk', 'retirement'],
};
const CATEGORIES = ['finance', 'investing'] as const;
const AREAS_PER_CATEGORY = 2;
const RATE_VS_INFLATION = 'rate-vs-inflation';
const MAX_INFLATION_RATE = 3;
const MIN_POSITIONS = 2;

const isSlot = (name: string): name is Slot => (SLOTS as readonly string[]).includes(name);

function wellFormed(q: Partial<CheckQuestion> | null): q is CheckQuestion {
  if (!q || typeof q.id !== 'string' || !q.category || !q.area) return false;
  const inCategory = AREAS[q.category]?.includes(q.area) === true;
  const prompts = typeof q.genericPrompt === 'string' && (q.accountPrompt === null || typeof q.accountPrompt === 'string');
  return inCategory && prompts && Array.isArray(q.slots);
}

/** A failed GET, or an item the front cannot use, counts as no question; an empty pool skips the Quick check. */
export async function fetchCheckQuestions(signal: AbortSignal): Promise<CheckQuestion[]> {
  try {
    const pool = await api<Partial<CheckQuestion>[]>('/api/check-questions', { signal });
    return Array.isArray(pool) ? pool.filter(wellFormed) : [];
  } catch {
    return [];
  }
}

/** A numeric EXPO_PUBLIC_QUIZ_SEED repeats the draw for a rehearsed demo; dev builds only. */
export function quizRng(seed = process.env.EXPO_PUBLIC_QUIZ_SEED, dev = __DEV__) {
  const numeric = !!seed?.trim() && Number.isFinite(Number(seed));
  return dev && numeric ? createRng(Number(seed)) : Math.random;
}

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
  const inflationOk = q.id !== RATE_VS_INFLATION || slotValues(bank).savingsInterestRate < MAX_INFLATION_RATE;
  return declared && filled && inflationOk;
}

/**
 * Two areas from each category, one question per area, finance first. Within an area a question whose account
 * version is usable wins. A category with fewer than two areas skips the whole Quick check.
 */
export function drawQuestions(pool: CheckQuestion[], bank: BankState, consent: boolean, rng: () => number): Drawn[] {
  // Code-unit order, so a seeded draw does not depend on the device's locale.
  const sorted = [...pool].sort((a, b) => (a.id < b.id ? -1 : 1));
  const pick = <T>(items: T[]) => items[Math.floor(rng() * items.length)];
  const drawn: Drawn[] = [];
  for (const category of CATEGORIES) {
    const inCategory = sorted.filter((q) => q.category === category);
    const areas = AREAS[category].filter((area) => inCategory.some((q) => q.area === area));
    if (areas.length < AREAS_PER_CATEGORY) return [];
    for (let i = 0; i < AREAS_PER_CATEGORY; i++) {
      const [area] = areas.splice(Math.floor(rng() * areas.length), 1);
      const ofArea = inCategory.filter((q) => q.area === area);
      const usable = ofArea.filter((q) => accountUsable(q, bank, consent));
      drawn.push({ question: pick(usable.length ? usable : ofArea) });
    }
  }
  return drawn;
}

type Part = { text: string; filled: boolean };

/** The prompt in pieces, so the numbers taken from the account can be highlighted. */
export function promptParts(question: CheckQuestion, bank: BankState, account: boolean): Part[] {
  if (!account) return [{ text: question.genericPrompt, filled: false }];
  const values = slotValues(bank);
  const part = (text: string, i: number): Part =>
    // Splitting on a capture group puts the slot names at the odd indexes.
    i % 2 ? { text: groupThousands(values[text as Slot]), filled: true } : { text, filled: false };
  return question.accountPrompt!.split(/\{(\w+)\}/).map(part).filter((p) => p.text);
}

export const toAnswer = ({ question, answer }: Drawn): CheckAnswer => ({
  questionId: question.id,
  text: answer ?? null,
});
