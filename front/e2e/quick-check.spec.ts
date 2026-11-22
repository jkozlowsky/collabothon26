import { expect, test, type Page } from './fixtures';

import { answerSurvey, expectDisabled, openApp, pickAlex, resetOnboarding, tap } from './app';
import { categorization } from '../src/test-utils/categorization';
import { POOL } from '../src/test-utils/checkPool';

const CATEGORIZATION_URL = '**/api/users/demo-user/categorization';
const ORDER = ['berlin-1/q1', 'seoul-1/q1', 'berlin-1/q2', 'seoul-1/q2'];
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
    answerCount: 3,
    gaps: [],
    startLesson: { lessonId: 'berlin-3', title: 'Emergency fund', area: 'saving', storyId: 'berlin', storyCity: 'Berlin' },
    ...patch,
  });

test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

/** The backend has no Jev key in CI: the questions, every step and the final POST are served by stubs. */
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

/** A fresh onboarding up to "Start the quick check"; registered after openApp, so these stubs win over its empty question list. */
async function toCheck(page: Page, options: Parameters<typeof stubQuickCheck>[1] = {}) {
  await openApp(page);
  const calls = await stubQuickCheck(page, options);
  await answerSurvey(page);
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
  await expect(page.getByTestId('quick-check-prompt')).toHaveText(FIRST.prompt);
  await expect(page.getByText('Only your answer is sent, never these numbers.')).toHaveCount(0);
  await expect(page.getByText('Example numbers')).toHaveCount(0);
  await expect(page.getByTestId('quick-check-unsure')).toContainText('That is fine. Your lessons cover it.');
  await expectDisabled(page, 'quick-check-continue');
  await expect(page.getByTestId('map-dock')).toHaveCount(0);

  await tap(page, `quick-check-option-${CORRECT[0]}`);
  await expect(page.getByTestId(`quick-check-option-${CORRECT[0]}-correct`)).toBeVisible();
  await expect(page.getByTestId('quick-check-feedback')).toContainText('Right');
  // The lesson's explanation, its [[inflation]] marker shown as plain words.
  await expect(page.getByTestId('quick-check-feedback')).toContainText('inflation is an average over a basket.');
  await expect(page.getByTestId('quick-check-feedback')).not.toContainText('[[');
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
  await expect(page.getByTestId('quick-check-feedback')).toContainText('The real return is the interest minus inflation');
  await expect(page.getByTestId('quick-check-feedback')).toBeInViewport();
  await tap(page, 'quick-check-continue');

  // done after three answers, before the maximum of six
  await expect(page.getByTestId('quick-check-status')).toHaveText('All set · That is enough to place you');
  await summary(page);
  await expect(page.getByTestId('summary-role')).toHaveText("You're an intermediate learner");
  await expect(page.getByTestId('summary-based-on')).toHaveText('Based on 3 answers and what your account shows.');
  await expect(page.getByTestId('summary-first-lesson')).toContainText('Emergency fund');
  await expect(page.getByTestId('summary-first-lesson')).toContainText('Berlin · stop 3 of 5');
  await expect(page.getByTestId('area-bar-saving')).toBeAttached();
  await expect(page.getByText(/confiden/i)).toHaveCount(0);
  await expect(page.getByTestId('summary-disclaimer')).toHaveText('This picks lessons for you. It is not investment advice.');

  expect(steps.map((s) => s.history.length)).toEqual([0, 1, 2, 3]);
  expect(finals).toHaveLength(1);
  expect(finals[0]).toMatchObject({
    consent: true,
    profile: { ageBand: '26-40', savingsCover: null, horizon: null },
    mastery: MASTERY,
    useRules: false,
    // The first step and one per answer.
    stepCallsMade: 4,
  });
  expect(finals[0].history).toEqual([
    { questionId: ORDER[0], optionIndex: CORRECT[0] },
    { questionId: ORDER[1], optionIndex: null },
    { questionId: ORDER[2], optionIndex: wrong },
  ]);
  expect(JSON.stringify(finals[0])).not.toMatch(/12,?500|1,?268/);

  await tap(page, 'summary-start');
  await expect(page.getByTestId('screen-learn')).toBeVisible();
});

test('the steps carry no time frame, and an answer is sent with only its option', async ({ page }) => {
  const { steps } = await toCheck(page);

  await question(page, 1);
  await expect(page.getByTestId('onboarding-close')).toHaveCount(0);
  expect(steps[0]).toMatchObject({ consent: true, profile: { ageBand: '26-40', savingsCover: null, horizon: null } });
  expect(steps[0]).toHaveProperty('facts');

  const wrong = (CORRECT[0] + 1) % FIRST.options.length;
  await tap(page, `quick-check-option-${wrong}`);
  await expect(page.getByTestId('quick-check-feedback')).toContainText('Not quite');
  await expect.poll(() => steps.length).toBe(2);
  expect(steps[1].history).toEqual([{ questionId: ORDER[0], optionIndex: wrong }]);
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
  const { finals } = await toCheck(page, { step: () => 'fail', reply: categorization({ source: 'fallback', startLesson: null }) });

  await summary(page);
  expect(finals).toHaveLength(1);
  expect(Object.keys(finals[0]).sort()).toEqual(['consent', 'facts']);
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

test('the line "We used a simpler check this time" shows when the model was asked and then failed', async ({ page }) => {
  const reply = ran({
    source: 'fallback',
    sharedWithModel: { facts: null, answers: { lifeStage: null, interests: [], experience: null, skipped: true }, profile: null, answerCount: 1, stepCallsMade: 1 },
  });
  await toCheck(page, { step: stepper(1), reply });
  await answer(page, 0);

  await expect(page.getByTestId('summary-simple')).toHaveText('We used a simpler check this time', { timeout: 15_000 });
});

test('a gap shows its card, titled by its direction', async ({ page }) => {
  const gaps = [
    { area: 'saving', direction: 'habit-ahead', because: 'Your account shows you move money to savings every month. Your Saving answers leave a few things open, which is where your first lesson starts.' },
    { area: 'investing', direction: 'knowledge-ahead', because: 'Your Investing answers show you understand how it works. Your account shows no investment products.' },
  ];
  await toCheck(page, { step: stepper(1), reply: ran({ gaps }) });
  await answer(page, 0);

  await expect(page.getByTestId('summary-gap-saving')).toContainText('Your habits are ahead of the theory', { timeout: 15_000 });
  await expect(page.getByTestId('summary-gap-investing')).toContainText('You know more than your account shows');
});

test('no gap note shows when no gap was found', async ({ page }) => {
  await toCheck(page, { step: stepper(1) });
  await answer(page, 0);

  await summary(page);
  await expect(page.getByTestId(/^summary-gap-/)).toHaveCount(0);
});

test('a reload of the summary rebuilds it from the stored row', async ({ page }) => {
  await toCheck(page, { step: stepper(1) });
  await answer(page, 0);
  await summary(page);

  const stored = ran();
  await page.route(CATEGORIZATION_URL, (route) => route.fulfill({ json: stored }));
  await page.goto('/learning-path');
  await pickAlex(page);
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
  await pickAlex(page);
  await expect(page.getByTestId('summary-map')).toBeVisible();
  await expect(page.getByTestId('area-level-saving')).toHaveText('Solid');
  await expect(page.getByTestId('area-level-investing')).toHaveText('Just starting');
});
