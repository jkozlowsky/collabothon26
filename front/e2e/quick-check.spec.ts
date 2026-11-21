import { expect, test, type Page } from './fixtures';

import { goToInvite, openApp, resetOnboarding, tap } from './app';
import { categorization } from '../src/test-utils/categorization';
import { POOL } from '../src/test-utils/checkPool';

const CATEGORIZATION_URL = '**/api/users/demo-user/categorization';
const ORDER = ['inflation-real-value', 'time-in-market', 'emergency-cushion-purpose', 'short-term-fall'];
const MASTERY = { saving: 0.6, investing: 0.25 };

type Body = { history: unknown[]; useRules: boolean; stepFellBack: boolean; profile: Record<string, string | null> };
type Step = (body: Body) => object | 'fail';

/** Asks ORDER one by one and says done after `doneAfter` answers. */
const stepper =
  (doneAfter = 3): Step =>
  ({ history, useRules, stepFellBack }) => ({
    mastery: history.length ? MASTERY : { saving: null, investing: null },
    nextQuestionId: history.length >= doneAfter ? null : ORDER[history.length],
    done: history.length >= doneAfter,
    useRules,
    stepFellBack,
  });

const ran = (patch: object = {}) =>
  categorization({
    profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
    mastery: MASTERY,
    confidence: { saving: 0.9, investing: 0.25 },
    answerCount: 3,
    confidenceGaps: [],
    startLesson: { lessonId: 'berlin-3', title: 'Emergency fund', area: 'saving', storyId: 'berlin', storyCity: 'Berlin' },
    ...patch,
  });

test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

/** The backend has no Jev key in CI: the bank, every step and the final POST are served by stubs. */
async function stubQuickCheck(page: Page, { step = stepper(), reply = ran(), stored }: { step?: Step; reply?: object; stored?: object } = {}) {
  const steps: Body[] = [];
  const finals: Record<string, unknown>[] = [];
  await page.route('**/api/check-questions', (route) => route.fulfill({ json: POOL }));
  await page.route('**/quick-check/step', (route) => {
    const body = route.request().postDataJSON() as Body;
    steps.push(body);
    const result = step(body);
    return result === 'fail' ? route.fulfill({ status: 500 }) : route.fulfill({ json: result });
  });
  await page.route(CATEGORIZATION_URL, (route) => {
    if (route.request().method() === 'POST') {
      finals.push(route.request().postDataJSON());
      return route.fulfill({ json: reply });
    }
    return stored ? route.fulfill({ json: stored }) : route.continue();
  });
  return { steps, finals };
}

/** Registered after openApp, so these stubs win over its empty bank. */
async function toConsentCard(page: Page, options: Parameters<typeof stubQuickCheck>[1] & { lifeStage?: boolean } = {}) {
  await openApp(page);
  const calls = await stubQuickCheck(page, options);
  await goToInvite(page);
  if (options.lifeStage) {
    await tap(page, 'onboarding-personalise');
    await tap(page, 'option-building');
    await tap(page, 'onboarding-continue');
    await tap(page, 'goal-start-saving');
    await tap(page, 'onboarding-continue');
    await tap(page, 'option-regular');
    await tap(page, 'onboarding-continue');
  } else {
    await tap(page, 'onboarding-skip-all');
  }
  return calls;
}

/** Answers the question on screen: a tile, then a chip. */
async function answer(page: Page, option: number, chip = 'sure') {
  await tap(page, `quick-check-option-${option}`);
  await tap(page, `confidence-${chip}`);
}
const toKnowCard = async (page: Page, consent: boolean) => {
  await tap(page, consent ? 'consent-accept' : 'consent-decline');
  await expect(page.getByTestId('categorizing-know')).toBeVisible();
};

test('consent, what we know, the time frame, three questions with chips, the summary, then the map', async ({ page }) => {
  const { steps, finals } = await toConsentCard(page, { lifeStage: true });
  await expect(page.getByTestId('consent-quickcheck-note')).toBeVisible();
  await toKnowCard(page, true);
  await expect(page.getByTestId('know-life-stage')).toContainText('Building my life');
  await expect(page.getByTestId('know-goals')).toContainText('Start saving');
  await expect(page.getByTestId('know-facts')).toContainText('From your accounts');
  await tap(page, 'know-start');

  await expect(page.getByText('Question 1 of up to 7')).toBeVisible();
  await expect(page.getByTestId('quick-check-prompt')).toBeFocused();
  await expect(page.getByText('Not scored')).toBeVisible();
  await tap(page, 'quick-check-option-1');

  await expect(page.getByText('Question 2 of up to 7')).toBeVisible();
  await expect(page.getByTestId('quick-check-why')).toContainText('Picked to learn more about Saving');
  await expect(page.getByText('Only your answer is sent, never these numbers.')).toBeVisible();
  await tap(page, 'quick-check-option-1');
  await expect(page.getByText('How sure are you?')).toBeVisible();
  await tap(page, 'confidence-guessing');
  await expect(page.getByText('Question 3 of up to 7')).toBeVisible();
  await tap(page, 'quick-check-unsure');
  await expect(page.getByText('Question 4 of up to 7')).toBeVisible();
  await answer(page, 2, 'fairly-sure');

  // done after three answers, before the maximum of six
  await expect(page.getByTestId('quick-check-status')).toHaveText('All set · That is enough to place you');
  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('summary-role')).toHaveText("You're an intermediate learner");
  await expect(page.getByTestId('summary-first-lesson')).toContainText('Emergency fund');
  await expect(page.getByTestId('summary-first-lesson')).toContainText('Berlin · stop 3 of 5');
  await expect(page.getByTestId('summary-disclaimer')).toHaveText('This picks lessons for you. It is not investment advice.');

  expect(steps.map((s) => s.history.length)).toEqual([0, 1, 2, 3]);
  expect(finals).toHaveLength(1);
  expect(finals[0]).toMatchObject({
    consent: true,
    profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
    mastery: MASTERY,
    useRules: false,
    stepCallsMade: 3,
  });
  expect(finals[0].history).toEqual([
    { questionId: ORDER[0], optionIndex: 1, confidence: 'guessing' },
    { questionId: ORDER[1], optionIndex: null, confidence: null },
    { questionId: ORDER[2], optionIndex: 2, confidence: 'fairly-sure' },
  ]);
  expect(JSON.stringify(finals[0])).not.toMatch(/12,?500|1,?268/);

  await tap(page, 'summary-start');
  await expect(page.getByTestId('screen-learn')).toBeVisible();
});

test('without consent the savings cover is asked and the questions use example numbers', async ({ page }) => {
  const { steps } = await toConsentCard(page, { lifeStage: true });
  await toKnowCard(page, false);
  await expect(page.getByTestId('know-facts')).toContainText('Account access is off');
  await tap(page, 'know-start');

  await expect(page.getByText('Question 1 of up to 8')).toBeVisible();
  await expect(page.getByTestId('quick-check-prompt')).toHaveText('How many months of spending could your savings cover?');
  await tap(page, 'quick-check-option-2');
  await expect(page.getByTestId('quick-check-prompt')).toHaveText(/When might you need the money/);
  await tap(page, 'quick-check-option-0');

  await expect(page.getByText('Question 3 of up to 8')).toBeVisible();
  await expect(page.getByTestId('quick-check-prompt')).toHaveText(POOL[1].genericPrompt);
  await expect(page.getByText('Example numbers')).toBeVisible();
  expect(steps[0]).toMatchObject({ consent: false, profile: { savingsCover: '3-6', horizon: 'within-1y' } });
  expect(steps[0]).not.toHaveProperty('facts');
});

test('with the life stage skipped the age band comes first', async ({ page }) => {
  const { steps } = await toConsentCard(page);
  await toKnowCard(page, true);
  await expect(page.getByTestId('know-life-stage')).toContainText('Life stage not shared');
  await tap(page, 'know-start');

  await expect(page.getByTestId('quick-check-prompt')).toHaveText('Which age band are you in?');
  await tap(page, 'quick-check-option-1');
  await expect(page.getByTestId('quick-check-prompt')).toHaveText(/When might you need the money/);
  await tap(page, 'quick-check-option-2');
  await expect(page.getByText('Question 3 of up to 8')).toBeVisible();
  expect(steps[0].profile).toEqual({ ageBand: '26-40', savingsCover: null, horizon: '5y+' });
});

test('"Use simple check instead" runs the whole test on rules', async ({ page }) => {
  const { steps, finals } = await toConsentCard(page, { lifeStage: true, step: (b) => ({ ...stepper(1)(b) as object, useRules: true }) });
  await toKnowCard(page, true);
  await tap(page, 'know-simple');
  await tap(page, 'quick-check-option-1');
  await expect(page.getByText('Question 2 of up to 7')).toBeVisible();
  await answer(page, 0);

  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 15_000 });
  expect(steps.map((s) => s.useRules)).toEqual([true, true]);
  expect(finals[0]).toMatchObject({ useRules: true, stepCallsMade: 0 });
});

test('a first step that fails skips the Quick check and the F1 path runs', async ({ page }) => {
  const { finals } = await toConsentCard(page, { lifeStage: true, step: () => 'fail', reply: categorization({ source: 'fallback', startLesson: null }) });
  await toKnowCard(page, false);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-2');
  await tap(page, 'quick-check-option-1');

  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 15_000 });
  expect(finals).toHaveLength(1);
  expect(Object.keys(finals[0]).sort()).toEqual(['consent']);
  await expect(page.getByTestId('summary-simple')).toHaveCount(0);
});

test('a later step that fails is retried with stepFellBack and the test goes on', async ({ page }) => {
  const step: Step = (body) => (body.history.length === 1 && !body.stepFellBack ? 'fail' : stepper(2)(body));
  const { steps, finals } = await toConsentCard(page, { lifeStage: true, step });
  await toKnowCard(page, true);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-1');
  await answer(page, 0);

  await expect(page.getByText('Question 3 of up to 7')).toBeVisible();
  expect(steps.slice(1).map((s) => [s.history.length, s.useRules, s.stepFellBack])).toEqual([
    [1, false, false],
    [1, false, true],
  ]);
  await answer(page, 1);
  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 15_000 });
  expect(steps.at(-1)).toMatchObject({ useRules: false, stepFellBack: true });
  expect(finals[0]).toMatchObject({ useRules: false });
});

test('Back returns to the card and the quick check restarts with no history and the answers to the profile kept', async ({ page }) => {
  const { steps } = await toConsentCard(page, { lifeStage: true });
  await toKnowCard(page, true);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-1');
  await answer(page, 0);
  await expect(page.getByText('Question 3 of up to 7')).toBeVisible();

  await tap(page, 'quick-check-back');
  await expect(page.getByTestId('categorizing-know')).toBeVisible();
  await tap(page, 'know-start');
  // The time frame is kept, so the first question comes straight back.
  await expect(page.getByText('Question 2 of up to 7')).toBeVisible();
  expect(steps.at(-1)).toMatchObject({ history: [], profile: { horizon: '1-5y' } });
  await expect(page.getByTestId('quick-check-prompt')).toBeFocused();
});

test('the line "We used a simpler check this time" shows when the model was asked and then failed', async ({ page }) => {
  const reply = ran({
    source: 'fallback',
    sharedWithModel: { facts: null, answers: { lifeStage: null, goals: [], experience: null, skipped: true }, profile: null, answerCount: 1, stepCallsMade: 1 },
  });
  await toConsentCard(page, { lifeStage: true, step: stepper(1), reply });
  await toKnowCard(page, true);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-1');
  await answer(page, 0);

  await expect(page.getByTestId('summary-simple')).toHaveText('We used a simpler check this time', { timeout: 15_000 });
});

test('with no gap the aligned card shows; a gap shows its card instead', async ({ page }) => {
  const gap = { area: 'saving', direction: 'under', because: 'On Saving you said “Guessing”, yet your answers show you already understand how it works.' };
  await toConsentCard(page, { lifeStage: true, step: stepper(1), reply: ran({ confidenceGaps: [gap] }) });
  await toKnowCard(page, true);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-1');
  await answer(page, 0);

  await expect(page.getByTestId('summary-gap-saving')).toContainText('You know more than you think', { timeout: 15_000 });
  await expect(page.getByTestId('summary-aligned')).toHaveCount(0);
});

test('the aligned card shows when no gap was found', async ({ page }) => {
  await toConsentCard(page, { lifeStage: true, step: stepper(1) });
  await toKnowCard(page, true);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-1');
  await answer(page, 0);

  await expect(page.getByTestId('summary-aligned')).toContainText('How sure you felt matches your answers', { timeout: 15_000 });
});

test('a reload of the summary rebuilds it from the stored row', async ({ page }) => {
  await toConsentCard(page, { lifeStage: true, step: stepper(1) });
  await toKnowCard(page, true);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-1');
  await answer(page, 0);
  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 15_000 });

  const stored = ran();
  await page.route(CATEGORIZATION_URL, (route) => route.fulfill({ json: stored }));
  await page.goto('/learning-path');
  await expect(page.getByTestId('summary-first-lesson')).toContainText('Emergency fund');
  await expect(page.getByTestId('summary-based-on')).toContainText('3 answers');
});

/** On the first knowledge question, with the dock on screen. */
async function toKnowledge(page: Page) {
  const calls = await toConsentCard(page, { lifeStage: true, step: stepper(5) });
  await toKnowCard(page, true);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-1');
  await expect(page.getByTestId('map-dock')).toBeVisible();
  return calls;
}

test('the dock fills in as answers come: a screen-reader text per area, then the detail sheet closes by button, Escape and scrim', async ({ page }) => {
  await toKnowledge(page);
  await expect(page.getByTestId('dock-sr-saving')).toHaveText('Saving: Not checked yet');
  await expect(page.getByTestId('dock-sr-investing')).toHaveText('Investing: Not checked yet');

  await answer(page, 0, 'sure');
  await expect(page.getByText('Question 3 of up to 7')).toBeVisible();
  await expect(page.getByTestId('dock-sr-saving')).toHaveText('Saving: Building');
  await expect(page.getByTestId('dock-sr-investing')).toHaveText('Investing: Just starting');

  await tap(page, 'map-dock');
  await expect(page.getByText('Your map in detail')).toBeVisible();
  await expect(page.getByText('How sure you felt')).toBeVisible();
  await expect(page.getByText('What your answers show')).toBeVisible();
  await expect(page.getByTestId('area-level-saving')).toHaveText('Building');
  await tap(page, 'sheet-close');
  await expect(page.getByText('Your map in detail')).toHaveCount(0);

  await tap(page, 'map-dock');
  await expect(page.getByText('Your map in detail')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Your map in detail')).toHaveCount(0);

  await tap(page, 'map-dock');
  await expect(page.getByText('Your map in detail')).toBeVisible();
  await page.mouse.click(20, 20);
  await expect(page.getByText('Your map in detail')).toHaveCount(0);
});

test('the bar rises over 700 ms and the diamond moves over 350 ms', async ({ page }) => {
  await toKnowledge(page);
  const transition = (id: string) => page.getByTestId(id).evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(await transition('dock-bar-saving')).toContain('0.7s');
  expect(await transition('dock-diamond-saving')).toContain('0.35s');
});

test('with reduced motion the dock markers and the sheet appear in place', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await toKnowledge(page);
  const transition = (id: string) => page.getByTestId(id).evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(await transition('dock-bar-saving')).toBe('0s');
  expect(await transition('dock-diamond-saving')).toBe('0s');

  await tap(page, 'map-dock');
  // The spring needs about half a second; 100 ms is enough for a sheet that does not animate.
  await page.waitForTimeout(100);
  const box = await page.getByTestId('map-sheet').boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
});

test('after a reload the summary draws both markers from the stored row', async ({ page }) => {
  await toConsentCard(page, { lifeStage: true, step: stepper(1) });
  await toKnowCard(page, true);
  await tap(page, 'know-start');
  await tap(page, 'quick-check-option-1');
  await answer(page, 0);
  await expect(page.getByTestId('summary-map')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('area-level-saving')).toHaveText('Building');

  await page.route(CATEGORIZATION_URL, (route) => route.fulfill({ json: ran({ readyForNext: true, mastery: { saving: 0.9, investing: 0.2 } }) }));
  await page.reload();
  await expect(page.getByTestId('summary-map')).toBeVisible();
  await expect(page.getByTestId('area-level-saving')).toHaveText('Solid');
  await expect(page.getByTestId('area-level-investing')).toHaveText('Just starting');
});
