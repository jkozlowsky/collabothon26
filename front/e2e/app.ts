import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** The user the app signs in as (EXPO_PUBLIC_USER_ID unset). Requests go through Metro's /api proxy. */
export const PROFILE_URL = '/api/users/demo-user/profile';
const ONBOARDING_URL = `${PROFILE_URL}/onboarding`;

export type SavedProfile = {
  userId: string;
  lifeStage: string | null;
  goals: string[];
  experience: string | null;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  onboardingCompletedAt: string | null;
};

/** Clear the onboarding answers and flag, so the app shows onboarding again. */
export async function resetOnboarding(request: APIRequestContext) {
  const res = await request.delete(ONBOARDING_URL);
  expect(res.status()).toBe(204);
}

export async function getProfile(request: APIRequestContext): Promise<SavedProfile> {
  const res = await request.get(PROFILE_URL);
  expect(res.ok()).toBe(true);
  return res.json();
}

/** Saving runs in the background after the last tap, so wait until the flag flips. */
export async function waitForCompletedOnboarding(request: APIRequestContext): Promise<SavedProfile> {
  await expect
    .poll(async () => (await getProfile(request)).onboardingCompleted, { message: 'onboarding saved' })
    .toBe(true);
  return getProfile(request);
}

/** A backend with a Jev key serves the Quick check questions; specs that do not test them run without. */
export const skipQuickCheck = (page: Page) =>
  page.route('**/api/check-questions', (route) => route.fulfill({ json: [] }));

/** Opens the bank and waits for the profile: until it has loaded, a tap on Learn does nothing. */
export async function gotoBank(page: Page) {
  const profile = page.waitForResponse((res) => res.url().endsWith(PROFILE_URL));
  await page.goto('/');
  await profile;
}

/** The app opens on the bank; Finance Quest (and its onboarding, the first time) starts from Learn. */
export async function openApp(page: Page) {
  await skipQuickCheck(page);
  await gotoBank(page);
  await page.getByTestId('nav-learn').click();
}

export const tap = (page: Page, testId: string) => page.getByTestId(testId).click();

/** Welcome → intro slide → the consent screen. */
export async function goToConsent(page: Page) {
  await tap(page, 'onboarding-start');
  await tap(page, 'onboarding-next');
  await expect(page.getByTestId('onboarding-consent')).toBeVisible();
}

export type Survey = { consent?: boolean; purpose?: string; horizon?: string; rating?: number };

/** What a run without account access answers on its three extra questions. */
export const WITHOUT_ACCOUNT = { lifeStage: 'building', experience: 'regular', savingsCover: '3-6' };

/** Answers a fresh onboarding from the welcome screen up to "Let's see what you already know". */
export async function answerSurvey(page: Page, { consent = true, purpose = 'home', horizon = '1-5y', rating = 2 }: Survey = {}) {
  await goToConsent(page);
  await tap(page, consent ? 'consent-accept' : 'consent-decline');
  const picks = [
    ...(consent ? [] : Object.values(WITHOUT_ACCOUNT).map((value) => `option-${value}`)),
    `option-${purpose}`,
    `option-${horizon}`,
    `confidence-${rating}`,
  ];
  for (const pick of picks) {
    await tap(page, pick);
    await tap(page, 'onboarding-continue');
  }
  await expect(page.getByTestId('onboarding-check-intro')).toBeVisible();
}

/** The path is built (a few seconds), then the summary's one button leads to Learn. */
export async function passSummary(page: Page) {
  await tap(page, 'summary-start');
  await expect(page.getByTestId('screen-learn')).toBeVisible({ timeout: 15_000 });
}

/** Skips onboarding on its first screen: no question is asked, the path is built by rules without the AI service, and the summary leads to Learn. */
export async function skipOnboarding(page: Page) {
  await tap(page, 'onboarding-skip-intro');
  await passSummary(page);
}

export async function expectOnLearn(page: Page) {
  await expect(page.getByTestId('screen-learn')).toBeVisible();
  await expect(page.getByTestId('onboarding-welcome')).toHaveCount(0);
}

/** React Native Web marks disabled pressables with aria-disabled. */
export async function expectDisabled(page: Page, testId: string, disabled = true) {
  const el = page.getByTestId(testId);
  if (disabled) await expect(el).toHaveAttribute('aria-disabled', 'true');
  else await expect(el).not.toHaveAttribute('aria-disabled', 'true');
}
