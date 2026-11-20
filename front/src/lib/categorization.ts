import { profileWritesSettled } from '@/hooks/useOnboarding';
import { api, ApiError } from '@/lib/api';
import { USER_ID } from '@/lib/user';
import type { Categorization, ConsentData, Facts } from '@/types/categorization';

const FACTS_PATH = `/api/mock-bank/customers/${encodeURIComponent(USER_ID)}/facts`;
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
 * Already categorised wins, whatever the facts did. A failed existence check throws: the caller may retry or
 * skip, but never POST, because a POST could overwrite a stored consent.
 */
export async function loadConsentData(signal: AbortSignal): Promise<ConsentData> {
  await profileSaved(signal);
  const [existing, facts] = await Promise.allSettled([
    api<Categorization>(CATEGORIZATION_PATH, { signal }).catch(nullOn404),
    api<Facts>(FACTS_PATH, { signal }).catch(nullOn404),
  ]);
  if (existing.status === 'rejected') throw existing.reason;
  if (existing.value) return { kind: 'categorized' };
  return facts.status === 'fulfilled' ? { kind: 'ask', facts: facts.value } : { kind: 'facts-failed' };
}

export async function categorize(consent: boolean, signal: AbortSignal): Promise<Categorization> {
  const body = JSON.stringify({ consent });
  await profileSaved(signal);
  for (let attempt = 1; ; attempt++) {
    try {
      return await api<Categorization>(CATEGORIZATION_PATH, { method: 'POST', body, signal });
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

/** The facts in plain words, one line per summary the consent card shows; an unknown band is shown raw. */
export function factLabels(f: Facts): string[] {
  return [
    `Age group ${f.ageBand.replace('-', '–')}`,
    INCOME[f.incomeBand] ?? `Income band ${f.incomeBand}`,
    BUFFER[f.cashBufferMonths] ?? `Cash buffer ${f.cashBufferMonths} months`,
    SAVINGS_RATE[f.savingsRate] ?? `Savings rate ${f.savingsRate}`,
    f.overdraftMonths === 0 ? 'Never below zero' : `Below zero in ${f.overdraftMonths} of 3 months`,
    f.savesRegularly ? 'Moves money to savings most months' : 'No regular transfers to savings',
    f.holdsInvestments ? 'Investment products with us' : 'No investment products with us',
    ...(!f.hasMortgage && !f.hasInsurance
      ? ['No mortgage or life insurance with us']
      : [
          f.hasMortgage ? 'Paying off a mortgage with us' : 'No mortgage with us',
          f.hasInsurance ? 'Life insurance with us' : 'No life insurance with us',
        ]),
  ];
}
