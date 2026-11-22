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
  pickAlex,
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
  await expect(page.getByText('Atlas lets your financial decisions land safely.')).toBeVisible();
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
  await expect(page.getByText('Only these summaries')).toHaveCount(0);
  await expect(page.getByTestId('consent-notice')).toHaveText(
    'Your answers, the topics you pick and ranges from your accounts are checked by an external AI provider to pick your first lesson. Exact account numbers never leave this phone. We keep the result, your topics and the ranges. Your choices are checked by an AI service.',
  );
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

test('one question leads to the quick check intro, with no way to skip; the picked paths are saved as interests', async ({ page, request }) => {
  await openApp(page);
  await goToConsent(page);
  await tap(page, 'consent-accept');

  await expect(page.getByText('What would you like to learn?')).toBeVisible();
  await expect(page.getByText(/^Step \d/)).toHaveCount(0);
  await expect(page.getByTestId('onboarding-skip')).toHaveCount(0);
  await expect(page.getByTestId('interest-saving')).toBeVisible();
  await expectDisabled(page, 'onboarding-continue');
  await tap(page, 'interest-risk');
  await tap(page, 'interest-saving');
  await expectDisabled(page, 'onboarding-continue', false);
  await tap(page, 'interest-not-sure');
  await expect(page.getByTestId('interest-risk')).toHaveAttribute('aria-checked', 'false');
  await tap(page, 'interest-saving');
  await expect(page.getByTestId('interest-not-sure')).toHaveAttribute('aria-checked', 'false');
  await tap(page, 'interest-risk');
  await tap(page, 'onboarding-continue');

  await expect(page.getByTestId('onboarding-check-intro')).toBeVisible();
  await expect(page.getByText('QUICK CHECK · 3–6 QUESTIONS')).toBeVisible();
  await expect(page.getByText("Let's see what you already know")).toBeVisible();
  await expect(page.getByText('About 2 minutes')).toBeVisible();
  await expect(page.getByTestId('quick-check-hero')).toBeVisible();
  await expect(page.getByTestId('check-skip')).toHaveCount(0);
  // openApp serves an empty question bank, so the test is left out and the path is built at once.
  await tap(page, 'check-start');
  await passSummary(page);

  const profile = await waitForCompletedOnboarding(request);
  expect(profile).toMatchObject({ lifeStage: null, interests: ['berlin', 'nairobi', 'seoul'], experience: null, onboardingSkipped: false });
  const categorization = await (await request.get('/api/users/demo-user/categorization')).json();
  expect(categorization).toMatchObject({ consent: true, bankData: true });

  await page.reload();
  await pickAlex(page);
  await expectOnLearn(page);
});

test('the back arrow steps back through every screen, keeping answers', async ({ page }) => {
  await openApp(page);
  await tap(page, 'onboarding-start');
  await expect(page.getByTestId('onboarding-intro')).toBeVisible();
  await tap(page, 'onboarding-back');
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();

  await answerSurvey(page);
  await tap(page, 'onboarding-back');
  await expect(page.getByTestId('onboarding-interests')).toBeVisible();
  await expect(page.getByTestId('interest-saving')).toHaveAttribute('aria-checked', 'true');
  await tap(page, 'onboarding-back');
  await expect(page.getByTestId('onboarding-consent')).toBeVisible();
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
  expect((await getProfile(request)).interests).toEqual([]);
  await tap(page, 'nav-learn');
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();

  await openApp(page);
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();
});
