import { expect, test } from '@playwright/test';

import { openApp, resetOnboarding, tap } from './app';

test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

test('the intro slides show the globe, the account example and the confidence example', async ({ page }) => {
  await openApp(page);
  await tap(page, 'onboarding-start');

  await expect(page.getByText('A world of money lessons')).toBeVisible();
  const card = page.getByTestId('globe-card');
  await expect(card).toContainText('FRANKFURT');
  await expect(card).toContainText('Your first share');
  for (const topic of ['Budgeting', 'Saving', 'Inflation', 'Investing', 'Risk & scams']) {
    await expect(page.getByText(topic, { exact: true })).toBeVisible();
  }

  await tap(page, 'onboarding-next');
  await expect(page.getByText('Lessons that fit your life')).toBeVisible();
  await expect(page.getByText('€ 4,280.52')).toBeVisible();
  await expect(page.getByText('Where did your €1,268 go?')).toBeVisible();

  await tap(page, 'onboarding-next');
  await expect(page.getByText('Grow confidence, not just knowledge')).toBeVisible();
  await expect(page.getByText('Next step: set up a monthly savings transfer')).toBeVisible();
});

test('the intro illustrations are pictures, not controls', async ({ page }) => {
  await openApp(page);
  await tap(page, 'onboarding-start');
  // On the globe slide the only buttons are the back arrow, Skip and Next.
  const buttons = page.getByTestId('onboarding-intro-lessons').getByRole('button');
  await expect(buttons).toHaveCount(3);

  await tap(page, 'onboarding-next');
  await expect(page.getByTestId('onboarding-intro-personal').getByRole('button')).toHaveCount(3);
  await tap(page, 'onboarding-next');
  await expect(page.getByTestId('onboarding-intro-confidence').getByRole('button')).toHaveCount(3);
});
