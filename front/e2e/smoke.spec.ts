import { expect, test } from '@playwright/test';

test('app opens on the bank; Learn runs onboarding and the consent card, then Map; Bank comes back; a transfer lowers the balance', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('owner-name')).toHaveText('Alex Krause');
  await expect(page.getByTestId('main-balance')).toHaveText('€ 4,280.52');

  // First Learn tap: onboarding, then the Map (lessons come from the backend).
  await page.getByTestId('nav-learn').click();
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-skip').click();
  await page.getByTestId('onboarding-skip-all').click();
  // demo-user has no bank accounts, so the consent card offers a single Continue.
  await page.getByTestId('consent-continue').click();
  await expect(page.getByTestId('screen-learn')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId(/^lesson-/).first()).toBeVisible();

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
