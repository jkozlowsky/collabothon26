import { expect, type Page, test } from '@playwright/test';

import { resetOnboarding, skipQuickCheck } from './app';

const CATEGORY_SLUGS = ['instruments', 'risk', 'costs', 'money-basics', 'psychology'] as const;

test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

/** Open the app and navigate from Bank to Learn, complete/skip onboarding if prompted, then open Duel. */
async function openDuelLobby(page: Page) {
  await skipQuickCheck(page);
  await page.goto('/');
  await page.getByTestId('nav-learn').click();

  const welcome = page.getByTestId('onboarding-welcome');
  const learn = page.getByTestId('screen-learn');

  await Promise.race([
    welcome.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    learn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);

  if (await welcome.isVisible()) {
    await page.getByTestId('onboarding-start').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-skip-all').click();
    await page.getByTestId('consent-decline').click();
    await page.getByTestId('summary-start').click();
    await expect(learn).toBeVisible({ timeout: 15000 });
  }

  await expect(learn).toBeVisible();
  await page.getByTestId('nav-duel').click();
  await expect(page.getByTestId('screen-duel')).toBeVisible();
}

/** Plays all 6 questions in a match without assuming which option is correct. */
async function playMatchQuestions(page: Page) {
  for (let q = 0; q < 6; q++) {
    // Wait for the question prompt to be rendered
    await expect(page.getByTestId('question-prompt')).toBeVisible({ timeout: 20_000 });

    // Select the first option
    await page.getByTestId('duel-option-0').click();

    // Wait for server feedback and the next question / continue button
    const nextBtn = page.getByTestId('duel-next-question');
    await expect(nextBtn).toBeVisible({ timeout: 20_000 });
    await nextBtn.click();
  }
}

test.describe('Duel flow', () => {
  test('duel lobby shows categories, plays solo and bot matches, and switches ranking segments', async ({ page }) => {
    test.setTimeout(300_000);
    await openDuelLobby(page);

    // 1. Lobby checks: verify 5 categories with level, Elo or Calibrating
    for (const slug of CATEGORY_SLUGS) {
      const row = page.getByTestId(`duel-category-${slug}`);
      await expect(row).toBeVisible();
      await expect(row).toContainText(/Lv \d+/);
    }
    await expect(page.getByTestId('duel-category-instruments')).toContainText('Elo');
    await expect(page.getByTestId('duel-category-costs')).toContainText('Calibrating');
    await expect(page.getByTestId('duel-category-money-basics')).toContainText('Calibrating');

    // 2. Play a SOLO match to result screen
    await page.getByTestId('duel-mode-solo').click();
    await page.getByTestId('duel-category-instruments').click();

    // Answer all 6 questions
    await playMatchQuestions(page);

    // Result screen and review list
    await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 25_000 });
    const reviewCard = page.getByTestId('result-review');
    await expect(reviewCard).toBeVisible();
    await expect(reviewCard.locator('[data-testid^="review-"]').first()).toBeVisible();

    // Return to lobby
    await page.getByTestId('result-back-lobby').click();
    await expect(page.getByTestId('screen-duel')).toBeVisible();

    // 3. Play a BOT match to result screen
    await page.getByTestId('duel-mode-bot').click();
    await page.getByTestId('duel-category-psychology').click();

    // Answer all 6 questions
    await playMatchQuestions(page);

    // The simulated bot answers 8-30 s per question, so the match settles up to ~3 min after it starts.
    await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 200_000 });
    await expect(page.getByTestId('result-review')).toBeVisible();

    // 4. Open Rankings and switch all 4 segments
    await page.getByTestId('result-see-rankings').click();
    await expect(page.getByTestId('screen-duel-rankings')).toBeVisible();

    const tabs = [
      'rankings-tab-weekly',
      'rankings-tab-category',
      'rankings-tab-overall',
      'rankings-tab-friends',
    ];

    for (const tabId of tabs) {
      const tab = page.getByTestId(tabId);
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }

    // Go back from rankings
    await page.getByTestId('rankings-back').click();
    await expect(page.getByTestId('screen-duel')).toBeVisible();
  });
});
