import { expect, test } from '@playwright/test';

import { resetOnboarding } from './app';

// The test needs a user who has not been through onboarding yet, and leaves it that way for the next run.
test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

test('new user skips onboarding and lands on the Learn tab with lessons from the backend', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-skip').click();
  await page.getByTestId('onboarding-skip-all').click();
  await expect(page.getByTestId('screen-learn')).toBeVisible();
  await expect(page.getByTestId(/^lesson-/).first()).toBeVisible();
});
