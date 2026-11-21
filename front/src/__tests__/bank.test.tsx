import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';

import { resetAtlasNudges } from '@/components/bank/AtlasNudge';
import { pressKey } from '@/components/bank/Keypad';
import { setAtlasDot } from '@/lib/atlasOrb';
import { loanQuote } from '@/lib/bank/loan';
import { formatEUR, isValidIban, maskIban, parseAmount } from '@/lib/bank/money';
import { bankReducer, validateOrder, validateTransfer } from '@/lib/bank/reducer';
import { seedAccount } from '@/lib/bank/seed';
import { allocation, depotChart, depotTotal, largestPosition, savingsShare, totalCreditOutstanding } from '@/lib/bank/selectors';
import { appRoutes } from '@/test-utils/routes';

describe('seed', () => {
  test('is deterministic: the same seed gives the same bank', () => {
    expect(seedAccount()).toEqual(seedAccount());
    expect(seedAccount(1)).not.toEqual(seedAccount(2));
  });

  test('matches the numbers in the Figma bank frames', () => {
    const s = seedAccount();
    expect(s.account.balance).toBe(428052);
    expect(s.account.monthIn).toBe(215000);
    expect(s.account.monthOut).toBe(126840);
    expect(depotTotal(s)).toBe(694010);
    expect(s.loan.remaining).toBe(840000);
    expect(s.savings.balance).toBe(1250000);
    expect(s.transactions.slice(0, 4).map((t) => t.title)).toEqual(['Supermarket', 'Salary', 'Streaming subscription', 'Transfer to Anna']);
    expect(allocation(s).map((a) => a.share)).toEqual([55, 25, 12, 8]);
  });

  test('every chart range ends on today’s depot value', () => {
    const s = seedAccount();
    for (const r of ['1W', '1M', '1Y', 'Max'] as const) {
      const { points } = depotChart(s, r);
      expect(Math.round(points[points.length - 1])).toBe(694010);
    }
  });
});

describe('money', () => {
  test('formats like the design', () => {
    expect(formatEUR(428052)).toBe('€ 4,280.52');
    expect(formatEUR(-4218)).toBe('−€ 42.18');
    expect(formatEUR(215000, { signed: true })).toBe('+€ 2,150.00');
    expect(formatEUR(300000, { whole: true })).toBe('€ 3,000');
    expect(formatEUR(428052, { hidden: true })).toBe('€ ••••');
  });

  test('parses keypad input and checks IBAN shape', () => {
    expect(parseAmount('25.5')).toBe(2550);
    expect(parseAmount('1,280.40')).toBe(128040);
    expect(parseAmount('1.234')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(isValidIban('de89 3704 0044 0532 0148 21')).toBe(true);
    expect(isValidIban('DE89 3704')).toBe(false);
    expect(maskIban('DE89 3704 0044 0532 0148 21')).toBe('DE89 3704 •••• •••• 4821');
  });

  test('keypad allows one decimal point and two decimals', () => {
    expect(['1', '2', '.', '5', '0', '9'].reduce((v, k) => pressKey(v, k as never), '')).toBe('12.50');
    expect(pressKey('', '.')).toBe('0.');
    expect(pressKey('12', 'back')).toBe('1');
  });
});

describe('transfer', () => {
  const s = seedAccount();
  const toAnna = { recipient: { contactId: 'anna' }, amount: 2500, reference: 'Dinner' };

  test('books the transfer: balance, month out, activity and pending all update', () => {
    const next = bankReducer(s, { type: 'transfer', input: toAnna, time: '10:15' });
    expect(next.account.balance).toBe(428052 - 2500);
    expect(next.account.monthOut).toBe(126840 + 2500);
    expect(next.transactions[0]).toMatchObject({ title: 'Transfer to Anna', amount: -2500, daysAgo: 0, status: 'pending' });
    expect(next.pending[0]).toMatchObject({ title: 'Transfer to Anna', when: 'Today 10:15' });
  });

  test('rejects bad input and leaves the state alone', () => {
    expect(validateTransfer(s, { ...toAnna, amount: 0 })).toMatch(/above/);
    expect(validateTransfer(s, { ...toAnna, amount: -100 })).toMatch(/above/);
    expect(validateTransfer(s, { ...toAnna, amount: 428053 })).toMatch(/available balance/);
    expect(validateTransfer(s, { ...toAnna, recipient: { contactId: 'nobody' } })).toMatch(/recipient/);
    expect(validateTransfer(s, { ...toAnna, recipient: { name: 'Julia', iban: 'DE12' } })).toMatch(/IBAN/);
    expect(validateTransfer(s, { ...toAnna, recipient: { name: ' ', iban: 'DE89370400440532014821' } })).toMatch(/name/);
    expect(bankReducer(s, { type: 'transfer', input: { ...toAnna, amount: 999999999 }, time: '10:15' })).toBe(s);
  });

  test('a new recipient becomes a contact', () => {
    const input = { recipient: { name: 'Julia Weber', iban: 'DE02 1203 0000 0000 2020 99' }, amount: 1000, reference: '' };
    const next = bankReducer(s, { type: 'transfer', input, time: '10:15' });
    expect(next.contacts.at(-1)).toMatchObject({ name: 'Julia Weber', initials: 'JW' });
  });
});

describe('orders and selectors', () => {
  const s = seedAccount();

  test('a demo buy moves depot cash into the position', () => {
    const next = bankReducer(s, { type: 'order', input: { holdingId: 'gov-bond', amount: 10000 } });
    expect(next.holdings.find((h) => h.id === 'gov-bond')!.value).toBe(91200);
    expect(next.holdings.find((h) => h.id === 'cash')!.value).toBe(45240);
    expect(depotTotal(next)).toBe(depotTotal(s));
    expect(validateOrder(s, { holdingId: 'gov-bond', amount: 55241 })).toMatch(/cash/);
    expect(validateOrder(s, { holdingId: 'cash', amount: 100 })).toMatch(/position/);
  });

  test('lesson numbers come from the account', () => {
    expect(largestPosition(s).name).toBe('World Equity ETF');
    expect(largestPosition(s).share).toBeCloseTo(381240 / 694010);
    expect(savingsShare(s)).toBeCloseTo(1250000 / (428052 + 1250000 + 694010));
    expect(totalCreditOutstanding(s)).toBe(840000 + 164000 + 0 + 24000);
  });

  test('loan quote: €10,000 over 48 months at 4.9%', () => {
    const q = loanQuote(1000000, 48, 4.9);
    expect(q.monthly).toBe(22984);
    expect(q.totalRepaid).toBe(22984 * 48);
    expect(q.totalInterest).toBe(22984 * 48 - 1000000);
  });
});

describe('bank shell', () => {
  beforeEach(() => {
    // A returning user, so Learn opens without onboarding.
    globalThis.fetch = jest.fn((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(url.endsWith('/profile') ? { userId: 'demo-user', goals: [], onboardingCompleted: true } : []),
      }),
    ) as jest.Mock;
    resetAtlasNudges();
    setAtlasDot(false);
  });

  /** The popup waits about a second after the tab opens. */
  const popup = (id: string) => screen.findByTestId(id, {}, { timeout: 3000 });
  /** Popup tests wait out the popup's delays (about a second in, a moment to fly out). */
  const POPUP_TEST_MS = 15_000;

  test('Atlas pops up on Credits with the instalments story, once, and a tap opens it', async () => {
    await renderRouter(appRoutes, { initialUrl: '/credits' });
    await screen.findByTestId('screen-credits');
    // Not straight away: the user sees the bank first.
    expect(screen.queryByTestId('fq-teaser-credits')).toBeNull();
    const card = await popup('fq-teaser-credits');
    expect(card).toHaveTextContent('Start: Twelve easy payments', { exact: false });
    expect(card).toHaveTextContent('Lesson 1 of 5', { exact: false });
    expect(screen.getByTestId('fq-teaser-credits-timer')).toBeOnTheScreen();

    await fireEvent.press(card);
    expect(screen).toHavePathname('/story/sao-paulo');
    expect(screen).toHaveSearchParams({ id: 'sao-paulo', lesson: 'sao-paulo-1' });
  }, POPUP_TEST_MS);

  test('closed, the popup goes into the Atlas button, which keeps a dot until tapped', async () => {
    await renderRouter(appRoutes, { initialUrl: '/invest' });
    await popup('fq-teaser-invest');
    expect(screen.queryByTestId('nav-learn-dot')).toBeNull();

    await fireEvent.press(screen.getByTestId('fq-teaser-invest-dismiss'));
    await waitFor(() => expect(screen.queryByTestId('fq-teaser-invest')).toBeNull());
    expect(screen.getByTestId('nav-learn-dot')).toBeOnTheScreen();

    // It does not come back on the same tab.
    await fireEvent.press(screen.getByTestId('nav-payments'));
    await fireEvent.press(screen.getByTestId('nav-invest'));
    await act(() => jest.advanceTimersByTimeAsync(1500));
    expect(screen.queryByTestId('fq-teaser-invest')).toBeNull();

    await fireEvent.press(screen.getByTestId('nav-learn'));
    expect(screen.queryByTestId('nav-learn-dot')).toBeNull();
  }, POPUP_TEST_MS);

  test('before onboarding, the popup starts from the user\'s own numbers', async () => {
    globalThis.fetch = jest.fn((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(url.endsWith('/profile') ? { userId: 'demo-user', goals: [], onboardingCompleted: false } : []),
      }),
    ) as jest.Mock;
    await renderRouter(appRoutes, { initialUrl: '/' });
    const card = await popup('fq-teaser-home');
    expect(card).toHaveTextContent('You have € 12,500 in savings at 2.25% a year. Learn how to keep it from losing value.', { exact: false });
    expect(card).toHaveTextContent('Saving', { exact: false });
    // A tap leads into onboarding first.
    await fireEvent.press(card);
    expect(screen).toHavePathname('/onboarding');
  }, POPUP_TEST_MS);

  test('opens on the bank, and a transfer to Anna lowers the balance', async () => {
    await renderRouter(appRoutes, { initialUrl: '/' });
    expect(await screen.findByTestId('owner-name')).toHaveTextContent('Alex Krause');
    expect(screen.getByTestId('main-balance')).toHaveTextContent('€ 4,280.52');

    await fireEvent.press(screen.getByTestId('action-transfer'));
    await fireEvent.press(screen.getByTestId('contact-anna'));
    for (const k of ['2', '5']) await fireEvent.press(screen.getByTestId(`key-${k}`));
    expect(screen.getByTestId('transfer-amount')).toHaveTextContent('€ 25');
    await fireEvent.press(screen.getByTestId('transfer-amount-continue'));
    await fireEvent.press(screen.getByTestId('transfer-send'));
    expect(screen.getByTestId('transfer-done')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('transfer-finish'));

    expect(screen.getByTestId('main-balance')).toHaveTextContent('€ 4,255.52');
    // The new transfer is the top row ("Today"); yesterday's one to Anna moved out of the top four.
    const recent = within(screen.getByTestId('recent-activity'));
    expect(recent.getByText('Transfer to Anna')).toBeOnTheScreen();
    expect(recent.getByText('Today · Transfer')).toBeOnTheScreen();
  });

  test('the eye hides every amount', async () => {
    await renderRouter(appRoutes, { initialUrl: '/' });
    await fireEvent.press(await screen.findByTestId('toggle-amounts'));
    expect(screen.getByTestId('main-balance')).toHaveTextContent('€ ••••');
    expect(screen.getByTestId('depot-total')).toHaveTextContent('€ ••••');
  });

  test('the nav switches to Learn and back to the bank tab you left', async () => {
    await renderRouter(appRoutes, { initialUrl: '/' });
    await screen.findByTestId('screen-overview');
    await act(async () => {}); // let the profile request resolve

    await fireEvent.press(screen.getByTestId('nav-credits'));
    expect(await screen.findByTestId('screen-credits')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('nav-learn'));
    expect(await screen.findByTestId('nav-bank')).toBeOnTheScreen();
    expect(screen.getByTestId('nav-glossary')).toBeOnTheScreen();
    expect(screen.queryByTestId('nav-payments')).toBeNull();

    await fireEvent.press(screen.getByTestId('nav-bank'));
    expect(await screen.findByTestId('nav-learn')).toBeOnTheScreen();
    expect(screen.getByTestId('nav-credits')).toBeSelected();
  });

  test('Buy goes through the Atlas nudge before the demo order', async () => {
    await renderRouter(appRoutes, { initialUrl: '/invest' });
    await fireEvent.press(await screen.findByTestId('holding-gov-bond'));
    await fireEvent.press(screen.getByTestId('holding-buy'));
    expect(screen.getByText('Diversification, before you decide')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('trade-continue'));
    for (const k of ['1', '0', '0']) await fireEvent.press(screen.getByTestId(`key-${k}`));
    await fireEvent.press(screen.getByTestId('trade-confirm'));
    expect(within(screen.getByTestId('holding-gov-bond')).getByText('€ 912.00')).toBeOnTheScreen();
  });
});
