import { expect, test } from '@playwright/test';

import { resetOnboarding, skipQuickCheck } from './app';

// The test needs a user who has not been through onboarding yet, and leaves it that way for the next run.
test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

test('app opens on the bank; Learn runs onboarding and the consent card, then the globe and a story; Bank comes back; a transfer lowers the balance', async ({ page, request }) => {
  await skipQuickCheck(page);
  await page.goto('/');
  await expect(page.getByTestId('owner-name')).toHaveText('Alex Krause');
  await expect(page.getByTestId('main-balance')).toHaveText('€ 4,280.52');

  // First Learn tap: onboarding, then the Map (lessons come from the backend).
  await page.getByTestId('nav-learn').click();
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-skip-all').click();
  // The consent card previews the facts from the bank on screen; sharing them sends exactly those.
  await expect(page.getByTestId('consent-slip')).toContainText('Over 6 months of spending covered');
  await page.getByTestId('consent-accept').click();
  await page.getByTestId('summary-all').click();
  await expect(page.getByTestId('screen-learn')).toBeVisible({ timeout: 15_000 });
  const categorization = await (await request.get('/api/users/demo-user/categorization')).json();
  expect(categorization).toMatchObject({ consent: true, bankData: true, lifeStage: null });
  await expect(page.getByTestId('globe')).toBeVisible();

  // The globe opens on the current story with its callout; Continue leads to the story's lessons.
  await page.getByTestId('pin-callout-open').click();
  await expect(page.getByTestId(/^lesson-/).first()).toBeVisible();
  await page.goBack();

  // Back to the bank, then send Anna € 25.
  await page.getByTestId('nav-bank').click();
  await page.getByTestId('action-transfer').click();
  // Scoped to the sheet: the Payments page (rendered next door in the pager) shows Anna too.
  await page.getByTestId('transfer-sheet').getByTestId('contact-anna').click();
  await page.getByTestId('key-2').click();
  await page.getByTestId('key-5').click();
  await page.getByTestId('transfer-amount-continue').click();
  await page.getByTestId('transfer-send').click();
  await page.getByTestId('transfer-finish').click();
  await expect(page.getByTestId('main-balance')).toHaveText('€ 4,255.52');
});
