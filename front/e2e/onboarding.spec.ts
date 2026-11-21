import { expect, test } from './fixtures';

import {
  expectDisabled,
  expectOnLearn,
  getProfile,
  goToInvite,
  openApp,
  passConsent,
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

test('a new user can skip the questions; that is saved and onboarding does not come back', async ({ page, request }) => {
  expect((await getProfile(request)).onboardingCompleted).toBe(false);
  await openApp(page);
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();
  await expect(page.getByText('Learn how money works. Challenge your ideas with others.')).toBeVisible();

  await goToInvite(page);
  await expect(page.getByText('Got a minute for a few questions?')).toBeVisible();
  await tap(page, 'onboarding-skip-all');
  await passConsent(page);
  await expectOnLearn(page);

  const profile = await waitForCompletedOnboarding(request);
  expect(profile).toMatchObject({ onboardingCompleted: true, onboardingSkipped: true, goals: [], lifeStage: null });

  await page.reload();
  await expectOnLearn(page);
});

test('the welcome screen introduces Atlas, and the map and duel slides lead to the questions', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Learn how money works. Challenge your ideas with others.')).toBeVisible();
  await tap(page, 'onboarding-start');
  await expect(page.getByTestId('onboarding-intro')).toBeVisible();
  await tap(page, 'onboarding-next');
  await expect(page.getByTestId('onboarding-challenge')).toBeVisible();
  await tap(page, 'onboarding-challenge-next');
  await expect(page.getByTestId('onboarding-invite')).toBeVisible();
});

test('answers to all three questions are saved on the profile', async ({ page, request }) => {
  await openApp(page);
  await goToInvite(page);
  await tap(page, 'onboarding-personalise');

  // 1. Life stage
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await expectDisabled(page, 'onboarding-continue');
  await tap(page, 'option-building');
  await expectDisabled(page, 'onboarding-continue', false);
  await tap(page, 'onboarding-continue');

  // 2. Goals: grouped by area, no upper limit, all on one screen.
  for (const area of ['Everyday money', 'Saving', 'Borrowing', 'Investing', 'Protect & plan']) {
    await expect(page.getByText(area, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Pick as many as you like.', { exact: false })).toBeVisible();
  const goals = ['budget', 'start-saving', 'credit-cards', 'stocks-etfs', 'crypto', 'insurance', 'retirement'];
  for (const g of goals) await tap(page, `goal-${g}`);
  await expect(page.getByText(`${goals.length} selected`)).toBeVisible();
  await tap(page, 'goal-crypto'); // tapping again deselects
  await expect(page.getByText(`${goals.length - 1} selected`)).toBeVisible();
  await tap(page, 'onboarding-continue');

  // 3. How the user manages money today, with the "I don't save yet" option. It is the last question.
  await expect(page.getByText('Step 3 of 3')).toBeVisible();
  await expect(page.getByText('How do you manage your money today?')).toBeVisible();
  await expect(page.getByText("But I'd like to start")).toBeVisible();
  await expect(page.getByTestId('onboarding-continue')).toHaveText('Finish');
  await expectDisabled(page, 'onboarding-continue');
  await tap(page, 'option-not-saving');
  await tap(page, 'onboarding-continue');
  await passConsent(page);
  await expectOnLearn(page);

  const profile = await waitForCompletedOnboarding(request);
  expect(profile).toMatchObject({
    lifeStage: 'building',
    goals: goals.filter((g) => g !== 'crypto'),
    experience: 'not-saving',
    onboardingCompleted: true,
    onboardingSkipped: false,
  });

  await page.reload();
  await expectOnLearn(page);
});

test('skipping in the middle of the questions keeps the answers given so far', async ({ page, request }) => {
  await openApp(page);
  await goToInvite(page);
  await tap(page, 'onboarding-personalise');
  await tap(page, 'option-starting-out');
  await tap(page, 'onboarding-continue');
  await tap(page, 'goal-budget');
  await tap(page, 'onboarding-skip');
  await passConsent(page);
  await expectOnLearn(page);

  const profile = await waitForCompletedOnboarding(request);
  expect(profile).toMatchObject({
    lifeStage: 'starting-out',
    goals: ['budget'],
    experience: null,
    onboardingSkipped: false,
  });
});

test('the back arrow steps back through questions and the intro slide, keeping answers', async ({ page }) => {
  await openApp(page);
  await tap(page, 'onboarding-start');
  await expect(page.getByTestId('onboarding-intro')).toBeVisible();
  await tap(page, 'onboarding-back');
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();

  await goToInvite(page);
  await tap(page, 'onboarding-personalise');
  await tap(page, 'option-settled');
  await tap(page, 'onboarding-continue');
  await expect(page.getByText('Step 2 of 3')).toBeVisible();
  await tap(page, 'onboarding-back');
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await expect(page.getByTestId('option-settled')).toHaveAttribute('aria-checked', 'true');
});

test('"Restart onboarding" on Profile clears the answers and the flag; onboarding shows again', async ({ page, request }) => {
  await openApp(page);
  await goToInvite(page);
  await tap(page, 'onboarding-skip-all');
  await passConsent(page);
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
