import { expect, test } from '@playwright/test';

import { openApp, resetOnboarding, tap } from './app';

test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

test('the intro slide shows the globe of lesson topics', async ({ page }) => {
  await openApp(page);
  await tap(page, 'onboarding-start');

  await expect(page.getByText('A world of money lessons')).toBeVisible();
  const card = page.getByTestId('globe-card');
  await expect(card).toContainText('FRANKFURT');
  await expect(card).toContainText('Your first share');
  for (const topic of ['Budgeting', 'Saving', 'Inflation', 'Investing', 'Risk & scams']) {
    await expect(page.getByText(topic, { exact: true })).toBeVisible();
  }
});

test('the globe is a picture, not a control', async ({ page }) => {
  await openApp(page);
  await tap(page, 'onboarding-start');
  // The only buttons on the intro slide are the back arrow and Next.
  await expect(page.getByTestId('onboarding-intro').getByRole('button')).toHaveCount(2);
});
