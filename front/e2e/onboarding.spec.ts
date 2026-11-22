import { expect, test } from './fixtures';

import {
  answerSurvey,
  expectDisabled,
  expectOnLearn,
  finishOnboarding,
  getProfile,
  goToConsent,
  openApp,
  passSummary,
  resetOnboarding,
  tap,
  waitForCompletedOnboarding,
} from './app';

test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

test('the welcome screen introduces Atlas, and the map and duel slides lead to the consent screen', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Learn how money works. Challenge your ideas with others.')).toBeVisible();
  await tap(page, 'onboarding-start');
  await expect(page.getByTestId('onboarding-intro')).toBeVisible();
  await tap(page, 'onboarding-next');
  await expect(page.getByTestId('onboarding-challenge')).toBeVisible();
  await tap(page, 'onboarding-challenge-next');

  await expect(page.getByTestId('onboarding-consent')).toBeVisible();
  await expect(page.getByText('Your path starts from your account')).toBeVisible();
  await expect(page.getByText('Learn needs them to work.')).toBeVisible();
  await expect(page.getByTestId('consent-facts')).toContainText('Your account already shows');
  await expect(page.getByTestId('consent-facts')).toContainText('Age 26–40');
  await expect(page.getByTestId('consent-asks')).toContainText('What your savings are for');
  await expect(page.getByText('Only these summaries are shared, never your transactions.')).toBeVisible();
  await expect(page.getByTestId('consent-notice')).toContainText('Your choices are checked by an AI service.');
  await expect(page.getByTestId('consent-accept')).toHaveText('Use my account data');
  await expect(page.getByTestId('consent-not-now')).toHaveText('Not now');
  await expect(page.getByTestId('consent-decline')).toHaveCount(0);
});

test('"Not now" on the consent screen returns to the bank and saves nothing; Learn shows onboarding again', async ({ page, request }) => {
  await openApp(page);
  await goToConsent(page);
  await tap(page, 'consent-not-now');

  await expect(page.getByTestId('screen-overview')).toBeVisible();
  expect((await getProfile(request)).onboardingCompleted).toBe(false);
  await tap(page, 'nav-learn');
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();
});

test('two questions lead to the quick check intro, with no way to skip; the purpose is saved as goals', async ({ page, request }) => {
  await openApp(page);
  await goToConsent(page);
  await tap(page, 'consent-accept');

  await expect(page.getByText('Step 1 of 2')).toBeVisible();
  await expect(page.getByText('What are you saving for?')).toBeVisible();
  await expect(page.getByTestId('onboarding-skip')).toHaveCount(0);
  await expectDisabled(page, 'onboarding-continue');
  await tap(page, 'option-home');
  await expectDisabled(page, 'onboarding-continue', false);
  await tap(page, 'onboarding-continue');

  await expect(page.getByText('Step 2 of 2')).toBeVisible();
  await expectDisabled(page, 'onboarding-continue');
  await tap(page, 'option-1-5y');
  await tap(page, 'onboarding-continue');

  await expect(page.getByTestId('onboarding-check-intro')).toBeVisible();
  await expect(page.getByText('QUICK CHECK · 3–6 QUESTIONS')).toBeVisible();
  await expect(page.getByText("Let's see what you already know")).toBeVisible();
  await expect(page.getByText('About 2 minutes')).toBeVisible();
  await expect(page.getByTestId('quick-check-hero')).toBeVisible();
  await expect(page.getByTestId('check-skip')).toHaveCount(0);
  // openApp serves an empty question bank, so the test is left out and the path is built at once.
  await tap(page, 'check-start');
  await expect(page.getByTestId('summary-saving-for')).toHaveText('Saving for: A home of my own · needed in 1–5 years', { timeout: 15_000 });
  await passSummary(page);

  const profile = await waitForCompletedOnboarding(request);
  expect(profile).toMatchObject({ lifeStage: null, goals: ['start-saving', 'inflation'], experience: null, onboardingSkipped: false });
  const categorization = await (await request.get('/api/users/demo-user/categorization')).json();
  expect(categorization).toMatchObject({ consent: true, bankData: true });

  await page.reload();
  await expectOnLearn(page);
});

test('the back arrow steps back through every screen, keeping answers', async ({ page }) => {
  await openApp(page);
  await tap(page, 'onboarding-start');
  await expect(page.getByTestId('onboarding-intro')).toBeVisible();
  await tap(page, 'onboarding-back');
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();

  await answerSurvey(page);
  for (const step of ['horizon', 'purpose']) {
    await tap(page, 'onboarding-back');
    await expect(page.getByTestId(`onboarding-${step}`)).toBeVisible();
  }
  await expect(page.getByText('Step 1 of 2')).toBeVisible();
  await expect(page.getByTestId('option-home')).toHaveAttribute('aria-checked', 'true');
  await tap(page, 'onboarding-back');
  await expect(page.getByTestId('onboarding-consent')).toBeVisible();
});

test('"Edit answers" on Profile keeps its three steps with the goals grid', async ({ page, request }) => {
  await openApp(page);
  // "No plan yet" saves no goals, so the goals grid below starts empty.
  await finishOnboarding(page, { purpose: 'none' });
  await waitForCompletedOnboarding(request);
  await tap(page, 'nav-profile');
  await tap(page, 'edit-answers');

  // 1. Life stage
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await expectDisabled(page, 'onboarding-continue');
  await tap(page, 'option-building');
  await tap(page, 'onboarding-continue');

  // 2. Goals: grouped by area, no upper limit, all on one screen.
  for (const area of ['Everyday money', 'Saving', 'Borrowing', 'Investing', 'Protect & plan']) {
    await expect(page.getByText(area, { exact: true })).toBeVisible();
  }
  const goals = ['budget', 'start-saving', 'credit-cards', 'stocks-etfs', 'crypto', 'insurance', 'retirement'];
  for (const g of goals) await tap(page, `goal-${g}`);
  await expect(page.getByText(`${goals.length} selected`)).toBeVisible();
  await tap(page, 'goal-crypto'); // tapping again deselects
  await expect(page.getByText(`${goals.length - 1} selected`)).toBeVisible();
  await tap(page, 'onboarding-continue');

  // 3. How the user manages money today. It is the last question.
  await expect(page.getByText('Step 3 of 3')).toBeVisible();
  await expect(page.getByTestId('onboarding-continue')).toHaveText('Finish');
  await tap(page, 'option-not-saving');
  await tap(page, 'onboarding-continue');

  await expect(page.getByTestId('edit-answers')).toBeVisible();
  await expect
    .poll(async () => getProfile(request))
    .toMatchObject({ lifeStage: 'building', goals: goals.filter((g) => g !== 'crypto'), experience: 'not-saving', onboardingCompleted: true });
});

test('"Restart onboarding" on Profile clears the answers and the flag; onboarding shows again', async ({ page, request }) => {
  await openApp(page);
  await finishOnboarding(page);
  await expectOnLearn(page);
  await waitForCompletedOnboarding(request);

  await tap(page, 'nav-profile');
  await tap(page, 'restart-onboarding');
  // Restart goes back to the bank; the next Learn tap shows onboarding again.
  await expect(page.getByTestId('screen-overview')).toBeVisible();
  await expect.poll(async () => (await getProfile(request)).onboardingCompleted).toBe(false);
  expect((await getProfile(request)).goals).toEqual([]);
  await tap(page, 'nav-learn');
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();

  await openApp(page);
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();
});
