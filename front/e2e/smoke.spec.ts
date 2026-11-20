import { expect, test } from '@playwright/test';

test('new user skips onboarding and lands on the Learn tab with lessons from the backend', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-skip').click();
  await page.getByTestId('onboarding-skip-all').click();
  await expect(page.getByTestId('screen-learn')).toBeVisible();
  await expect(page.getByTestId(/^lesson-/).first()).toBeVisible();
});
