import { profileWritesSettled } from '@/hooks/useOnboarding';
import { api, ApiError } from '@/lib/api';
import { positionCount } from '@/lib/bank/selectors';
import { USER_ID } from '@/lib/user';
import type { BankState } from '@/types/bank';
import type { Categorization, Facts } from '@/types/categorization';
import type { CheckAnswer } from '@/types/quickCheck';

const CATEGORIZATION_PATH = `/api/users/${encodeURIComponent(USER_ID)}/categorization`;

export const TIMEOUT_MS = 10_000;
/** A 404 that arrives after the profile write has settled can still be transient on the backend, so it is retried. */
const PROFILE_RETRIES = 3;
const PROFILE_BACKOFF_MS = 400;

const isStatus = (e: unknown, status: number) => e instanceof ApiError && e.status === status;
const nullOn404 = (e: unknown) => {
  if (isStatus(e, 404)) return null;
  throw e;
};

/** Runs `run` with a signal that aborts after TIMEOUT_MS or when `outer` aborts (the screen unmounts). */
export function withTimeout<T>(outer: AbortSignal, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  outer.addEventListener('abort', abort);
  const timer = setTimeout(abort, TIMEOUT_MS);
  return run(ctrl.signal).finally(() => {
    clearTimeout(timer);
    outer.removeEventListener('abort', abort);
  });
}

/**
 * Waits for the onboarding's queued profile writes, so a restart's DELETE has landed before we read or write the
 * categorisation. Gives up when `signal` aborts, so a hung write still ends in the timeout.
 */
function profileSaved(signal: AbortSignal) {
  const aborted = new Promise<never>((_, reject) =>
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
  );
  return Promise.race([profileWritesSettled(), aborted]);
}

/**
 * Proves the backend answers once the profile is saved. A stored categorisation changes nothing: every onboarding
 * recategorises (spec Q20). A failed check throws, and the caller may retry or skip.
 */
export async function checkBackend(signal: AbortSignal): Promise<void> {
  await profileSaved(signal);
  await api<Categorization>(CATEGORIZATION_PATH, { signal }).catch(nullOn404);
}

/** `facts` only with consent: the backend refuses account data the user did not agree to share. */
export async function categorize(
  facts: Facts | null,
  signal: AbortSignal,
  answers: CheckAnswer[] = [],
): Promise<Categorization> {
  const consent = facts !== null;
  const body = JSON.stringify({
    consent,
    ...(consent && { facts }),
    ...(answers.length > 0 && { answers }),
  });
  await profileSaved(signal);
  for (let attempt = 1; ; attempt++) {
    try {
      const stored = await api<Categorization>(CATEGORIZATION_PATH, { method: 'POST', body, signal });
      // A backend without the Quick check leaves these out.
      return { ...stored, checks: stored.checks ?? [], startLesson: stored.startLesson ?? null };
    } catch (e) {
      if (!isStatus(e, 404) || attempt > PROFILE_RETRIES) throw e;
      await new Promise((r) => setTimeout(r, PROFILE_BACKOFF_MS * attempt));
    }
  }
}

/** Network errors, timeouts, 5xx and the transient 404/408/429 are worth a retry; other 4xx fail the same way again. */
export function isRetryable(e: unknown) {
  return !(e instanceof ApiError) || e.status >= 500 || [404, 408, 429].includes(e.status);
}

/** `bounds` are the lower edges of every band after the first (lower-inclusive, upper-exclusive). */
function band<T>(value: number, bounds: number[], bands: readonly T[]): T {
  const i = bounds.findIndex((b) => value < b);
  return bands[i === -1 ? bands.length - 1 : i];
}

const CENTS_PER_EUR = 100;
const SAVINGS_TARGET = /^(Savings|Depot)/;

/**
 * The only bank data that leaves the device: bands and flags, no name, id, exact amount, counterparty or date.
 * Rules: docs/specs/F1-profiling.md ("Facts").
 */
export function factsFrom(bank: BankState): Facts {
  const { account, savings, standingOrders, loan } = bank;
  const net = account.monthIn - account.monthOut;
  return {
    incomeBand: band(account.monthIn, [1000 * CENTS_PER_EUR, 2000 * CENTS_PER_EUR, 3500 * CENTS_PER_EUR, 5000 * CENTS_PER_EUR], ['<1k', '1-2k', '2-3.5k', '3.5-5k', '5k+']),
    cashBufferMonths:
      account.monthOut === 0
        ? '6+'
        : band((account.balance + savings.balance) / account.monthOut, [1, 3, 6], ['<1', '1-3', '3-6', '6+']),
    savingsRate:
      account.monthIn === 0
        ? account.monthOut === 0
          ? '20%+'
          : 'negative'
        : band(net / account.monthIn, [0, 0.1, 0.2], ['negative', '0-10%', '10-20%', '20%+']),
    savesRegularly: standingOrders.some((o) => o.interval.startsWith('Monthly') && SAVINGS_TARGET.test(o.recipient)),
    inOverdraft: account.balance < 0,
    holdsInvestments: positionCount(bank) > 0,
    hasLoan: loan.remaining > 0,
  };
}

const INCOME: Record<Facts['incomeBand'], string> = {
  '<1k': 'Under €1,000 income a month',
  '1-2k': '€1,000–2,000 income a month',
  '2-3.5k': '€2,000–3,500 income a month',
  '3.5-5k': '€3,500–5,000 income a month',
  '5k+': 'Over €5,000 income a month',
};

const BUFFER: Record<Facts['cashBufferMonths'], string> = {
  '<1': 'Under a month of spending covered',
  '1-3': '1 to 3 months of spending covered',
  '3-6': '3 to 6 months of spending covered',
  '6+': 'Over 6 months of spending covered',
};

const SAVINGS_RATE: Record<Facts['savingsRate'], string> = {
  negative: 'Spends more than comes in',
  '0-10%': 'Keeps under 10% of income',
  '10-20%': 'Keeps 10–20% of income',
  '20%+': 'Keeps 20% or more of income',
};

/** The facts in plain words, one line per summary the consent card shows. */
export function factLabels(f: Facts): string[] {
  return [
    INCOME[f.incomeBand],
    BUFFER[f.cashBufferMonths],
    SAVINGS_RATE[f.savingsRate],
    f.inOverdraft ? 'Current account below zero' : 'Current account above zero',
    f.savesRegularly ? 'Moves money to savings every month' : 'No regular transfers to savings',
    f.holdsInvestments ? 'Investment products with us' : 'No investment products with us',
    f.hasLoan ? 'Paying off a loan with us' : 'No loan with us',
  ];
}
