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

/** The app opens on the bank; Atlas (and its onboarding, the first time) starts from Learn. */
export async function openApp(page: Page) {
  await skipQuickCheck(page);
  await page.goto('/');
  await page.getByTestId('nav-learn').click();
}

export const tap = (page: Page, testId: string) => page.getByTestId(testId).click();

/** Welcome → map slide → duel slide → the "answer a few questions?" page. */
export async function goToInvite(page: Page) {
  await tap(page, 'onboarding-start');
  await tap(page, 'onboarding-next');
  await tap(page, 'onboarding-challenge-next');
  await expect(page.getByTestId('onboarding-invite')).toBeVisible();
}

/** A fresh onboarding continues to the consent card, then the summary; declining account data ends on Learn. */
export async function passConsent(page: Page) {
  await tap(page, 'consent-decline');
  await tap(page, 'summary-start');
  await expect(page.getByTestId('screen-learn')).toBeVisible({ timeout: 15_000 });
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
