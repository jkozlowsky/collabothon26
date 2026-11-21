import { expect, test, type Page } from '@playwright/test';

import { answerSurvey, expectDisabled, openApp, resetOnboarding, tap, WITHOUT_ACCOUNT, type Survey } from './app';
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
    profile: { ageBand: '26-40', savingsCover: null, horizon: '1-5y' },
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

const byId = (id: string) => POOL.find((q) => q.id === id)!;
const CORRECT = ORDER.map((id) => byId(id).correctIndex);
const FIRST = byId(ORDER[0]);

/** A fresh onboarding up to "Start the quick check"; registered after openApp, so these stubs win over its empty bank. */
async function toCheck(page: Page, options: Parameters<typeof stubQuickCheck>[1] & { survey?: Survey } = {}) {
  await openApp(page);
  const calls = await stubQuickCheck(page, options);
  await answerSurvey(page, options.survey);
  await tap(page, 'check-start');
  return calls;
}
const question = (page: Page, n: number) => expect(page.getByText(`Question ${n} of up to 6`)).toBeVisible();
/** Taps an option, then "Continue". */
async function answer(page: Page, option: number) {
  await tap(page, `quick-check-option-${option}`);
  await tap(page, 'quick-check-continue');
}
const summary = (page: Page) => expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 15_000 });

test('three questions with the right answer shown after each, the summary, then the map', async ({ page }) => {
  const { steps, finals } = await toCheck(page);

  await question(page, 1);
  await expect(page.getByTestId('quick-check-prompt')).toBeFocused();
  await expect(page.getByText('QUICK CHECK · SAVING')).toBeVisible();
  await expect(page.getByTestId('quick-check-why')).toContainText('Picked to learn more about Saving');
  await expect(page.getByText('Only your answer is sent, never these numbers.')).toBeVisible();
  await expect(page.getByTestId('quick-check-unsure')).toContainText('That is fine. Your lessons cover it.');
  await expectDisabled(page, 'quick-check-continue');
  await expect(page.getByTestId('map-dock')).toHaveCount(0);

  // Right, after a self-rating of 2 out of 5.
  await tap(page, `quick-check-option-${CORRECT[0]}`);
  await expect(page.getByTestId(`quick-check-option-${CORRECT[0]}-correct`)).toBeVisible();
  await expect(page.getByTestId('quick-check-feedback')).toContainText('Right');
  await expect(page.getByTestId('quick-check-feedback')).toContainText('You rated yourself low, yet you got this one. You may know more than you think.');
  await expect(page.getByTestId('quick-check-feedback')).toBeInViewport();
  await expectDisabled(page, `quick-check-option-${CORRECT[0]}`);
  await tap(page, 'quick-check-continue');

  await question(page, 2);
  await expect(page.getByTestId('quick-check-prompt')).toBeFocused();
  await tap(page, 'quick-check-unsure');
  await expect(page.getByTestId('quick-check-unsure-selected')).toBeVisible();
  await expect(page.getByTestId(`quick-check-option-${CORRECT[1]}-correct`)).toBeVisible();
  await expect(page.getByTestId('quick-check-feedback')).toContainText('Good to know');
  await tap(page, 'quick-check-continue');

  await question(page, 3);
  const wrong = (CORRECT[2] + 2) % byId(ORDER[2]).options.length;
  await tap(page, `quick-check-option-${wrong}`);
  await expect(page.getByTestId(`quick-check-option-${wrong}-wrong`)).toBeVisible();
  await expect(page.getByTestId(`quick-check-option-${CORRECT[2]}-correct`)).toBeVisible();
  await expect(page.getByTestId('quick-check-feedback')).toContainText('Not quite');
  await expect(page.getByTestId('quick-check-feedback')).toContainText('The right answer is marked above. Your lessons cover this.');
  await tap(page, 'quick-check-continue');

  // done after three answers, before the maximum of six
  await expect(page.getByTestId('quick-check-status')).toHaveText('All set · That is enough to place you');
  await summary(page);
  await expect(page.getByTestId('summary-saving-for')).toHaveText('Saving for: A home of my own · needed in 1–5 years');
  await expect(page.getByTestId('summary-role')).toHaveText("You're an intermediate learner");
  await expect(page.getByTestId('summary-based-on')).toHaveText('Based on 3 answers and how confident you said you feel.');
  await expect(page.getByTestId('summary-first-lesson')).toContainText('Emergency fund');
  await expect(page.getByTestId('summary-first-lesson')).toContainText('Berlin · stop 3 of 5');
  await expect(page.getByText('How confident you said you feel', { exact: true })).toBeVisible();
  await expect(page.getByTestId('summary-disclaimer')).toHaveText('This picks lessons for you. It is not investment advice.');

  expect(steps.map((s) => s.history.length)).toEqual([0, 1, 2, 3]);
  expect(finals).toHaveLength(1);
  expect(finals[0]).toMatchObject({
    consent: true,
    profile: { ageBand: '26-40', savingsCover: null, horizon: '1-5y' },
    mastery: MASTERY,
    useRules: false,
    stepCallsMade: 3,
  });
  expect(finals[0].history).toEqual([
    { questionId: ORDER[0], optionIndex: CORRECT[0], confidence: 'guessing' },
    { questionId: ORDER[1], optionIndex: null, confidence: null },
    { questionId: ORDER[2], optionIndex: wrong, confidence: 'guessing' },
  ]);
  expect(JSON.stringify(finals[0])).not.toMatch(/12,?500|1,?268/);

  await tap(page, 'summary-start');
  await expect(page.getByTestId('screen-learn')).toBeVisible();
});

test('without account access the survey\'s ranges are sent and the questions use example numbers', async ({ page }) => {
  const { steps } = await toCheck(page, { survey: { consent: false, horizon: 'within-1y', rating: 5 } });

  await question(page, 1);
  await expect(page.getByTestId('quick-check-prompt')).toHaveText(FIRST.genericPrompt);
  await expect(page.getByText('Example numbers')).toBeVisible();
  expect(steps[0]).toMatchObject({ consent: false, profile: { ageBand: null, savingsCover: WITHOUT_ACCOUNT.savingsCover, horizon: 'within-1y' } });
  expect(steps[0]).not.toHaveProperty('facts');

  // Wrong, after a self-rating of 5 out of 5.
  const wrong = (CORRECT[0] + 1) % FIRST.options.length;
  await tap(page, `quick-check-option-${wrong}`);
  await expect(page.getByTestId('quick-check-feedback')).toContainText('You said you feel confident, so this one is worth a closer look.');
  await expect.poll(() => steps.length).toBe(2);
  expect(steps[1].history).toEqual([{ questionId: ORDER[0], optionIndex: wrong, confidence: 'sure' }]);
});

test('the next question waits for "Continue", even when its step has answered', async ({ page }) => {
  const { steps } = await toCheck(page);
  await question(page, 1);
  await tap(page, `quick-check-option-${CORRECT[0]}`);
  await expect.poll(() => steps.length).toBe(2);
  await page.waitForTimeout(1_500);

  await question(page, 1);
  await expect(page.getByTestId('quick-check-feedback')).toBeVisible();
  await tap(page, 'quick-check-continue');
  await question(page, 2);
  await expect(page.getByTestId('quick-check-feedback')).toHaveCount(0);
});

test('a first step that fails skips the Quick check and the F1 path runs', async ({ page }) => {
  const { finals } = await toCheck(page, { survey: { consent: false }, step: () => 'fail', reply: categorization({ source: 'fallback', startLesson: null }) });

  await summary(page);
  expect(finals).toHaveLength(1);
  expect(Object.keys(finals[0]).sort()).toEqual(['consent']);
  await expect(page.getByTestId('summary-simple')).toHaveCount(0);
});

test('a later step that fails is retried with stepFellBack and the test goes on', async ({ page }) => {
  const step: Step = (body) => (body.history.length === 1 && !body.stepFellBack ? 'fail' : stepper(2)(body));
  const { steps, finals } = await toCheck(page, { step });
  await answer(page, 0);

  await question(page, 2);
  expect(steps.slice(1).map((s) => [s.history.length, s.useRules, s.stepFellBack])).toEqual([
    [1, false, false],
    [1, false, true],
  ]);
  await answer(page, 1);
  await summary(page);
  expect(steps.at(-1)).toMatchObject({ useRules: false, stepFellBack: true });
  expect(finals[0]).toMatchObject({ useRules: false });
});

test('Close leaves the test for Learn without building a path from it', async ({ page }) => {
  const { finals } = await toCheck(page);
  await question(page, 1);
  await tap(page, 'quick-check-option-0');
  await tap(page, 'onboarding-close');

  await expect(page.getByTestId('screen-learn')).toBeVisible();
  expect(finals).toHaveLength(0);
});

test('the line "We used a simpler check this time" shows when the model was asked and then failed', async ({ page }) => {
  const reply = ran({
    source: 'fallback',
    sharedWithModel: { facts: null, answers: { lifeStage: null, goals: [], experience: null, skipped: true }, profile: null, answerCount: 1, stepCallsMade: 1 },
  });
  await toCheck(page, { step: stepper(1), reply });
  await answer(page, 0);

  await expect(page.getByTestId('summary-simple')).toHaveText('We used a simpler check this time', { timeout: 15_000 });
});

test('a gap shows its card instead of the aligned one', async ({ page }) => {
  const gap = { area: 'saving', direction: 'under', because: 'You rated your confidence low, yet your Saving answers show you already understand how it works.' };
  await toCheck(page, { step: stepper(1), reply: ran({ confidenceGaps: [gap] }) });
  await answer(page, 0);

  await expect(page.getByTestId('summary-gap-saving')).toContainText('You know more than you think', { timeout: 15_000 });
  await expect(page.getByTestId('summary-gap-saving')).toContainText(gap.because);
  await expect(page.getByTestId('summary-aligned')).toHaveCount(0);
});

test('the aligned card shows when no gap was found', async ({ page }) => {
  await toCheck(page, { step: stepper(1) });
  await answer(page, 0);

  await expect(page.getByTestId('summary-aligned')).toContainText('Your confidence matches your answers', { timeout: 15_000 });
});

test('a reload of the summary rebuilds it from the stored row', async ({ page }) => {
  await toCheck(page, { step: stepper(1) });
  await answer(page, 0);
  await summary(page);

  const stored = ran();
  await page.route(CATEGORIZATION_URL, (route) => route.fulfill({ json: stored }));
  await page.goto('/learning-path');
  await expect(page.getByTestId('summary-first-lesson')).toContainText('Emergency fund');
  await expect(page.getByTestId('summary-based-on')).toContainText('3 answers');
});

test('with reduced motion the intro picture and the reveal show at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await stubQuickCheck(page);
  await answerSurvey(page);
  const animations = await page
    .getByTestId('quick-check-hero')
    .evaluate((hero) => [...hero.querySelectorAll('*')].map((el) => getComputedStyle(el).animationName));
  expect(new Set(animations)).toEqual(new Set(['none']));
  await expect(page.getByTestId('quick-check-hero').getByText('Right')).toBeVisible();

  await tap(page, 'check-start');
  await tap(page, `quick-check-option-${CORRECT[0]}`);
  await expect(page.getByTestId(`quick-check-option-${CORRECT[0]}-correct`)).toBeVisible();
  await expect(page.getByTestId('quick-check-feedback')).toBeVisible();
});

test('after a reload the summary draws both markers from the stored row', async ({ page }) => {
  await toCheck(page, { step: stepper(1) });
  await answer(page, 0);
  await expect(page.getByTestId('summary-map')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('area-level-saving')).toHaveText('Building');

  await page.route(CATEGORIZATION_URL, (route) => route.fulfill({ json: ran({ readyForNext: true, mastery: { saving: 0.9, investing: 0.2 } }) }));
  await page.reload();
  await expect(page.getByTestId('summary-map')).toBeVisible();
  await expect(page.getByTestId('area-level-saving')).toHaveText('Solid');
  await expect(page.getByTestId('area-level-investing')).toHaveText('Just starting');
});
