import { expect, type Page, test } from '@playwright/test';

import { resetOnboarding, skipQuickCheck } from './app';

const CATEGORY_SLUGS = ['seoul', 'berlin', 'sao-paulo', 'tokyo'] as const;

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
    // Wait for the question view to be rendered
    await expect(page.getByTestId('duel-question')).toBeVisible({ timeout: 20_000 });

    const quizOption = page.getByTestId('duel-option-0');
    const predictSubmit = page.getByTestId('duel-predict-submit');
    const chartSubmit = page.getByTestId('duel-chart-submit');
    const sortBtn = page.getByTestId('sort-left');
    const matchTile = page.getByTestId('match-left-0');

    await expect(
      quizOption
        .or(predictSubmit)
        .or(chartSubmit)
        .or(sortBtn)
        .or(matchTile)
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    if (await quizOption.isVisible()) {
      await quizOption.click();
    } else if (await predictSubmit.isVisible()) {
      await predictSubmit.click();
    } else if (await chartSubmit.isVisible()) {
      await chartSubmit.click();
    } else if (await sortBtn.isVisible()) {
      while (await sortBtn.isVisible()) {
        await sortBtn.click();
      }
    } else if (await matchTile.isVisible()) {
      for (let i = 0; i < 4; i++) {
        const left = page.getByTestId(`match-left-${i}`);
        const right = page.getByTestId(`match-right-${i}`);
        if (await left.isVisible()) await left.click();
        if (await right.isVisible()) await right.click();
      }
    }

    // Wait for server feedback and the next question / see results button
    const nextBtn = page.getByTestId('duel-next-question');
    await expect(nextBtn).toBeVisible({ timeout: 20_000 });
    await nextBtn.click();
  }
}

test.describe('Duel flow', () => {
  test('duel lobby shows categories, play and history tabs, human and solo modes, plays a solo match, and views weekly rankings', async ({ page }) => {
    test.setTimeout(300_000);
    await openDuelLobby(page);

    // 1. Lobby checks: verify 4 categories with level (Lv N)
    for (const slug of CATEGORY_SLUGS) {
      const row = page.getByTestId(`duel-category-${slug}`);
      await expect(row).toBeVisible();
      await expect(row).toContainText(/Lv \d+/);
    }

    // 2. Play and History tabs
    const historyTab = page.getByTestId('duel-tab-history');
    await expect(historyTab).toBeVisible();
    await historyTab.click();
    await expect(
      page.getByTestId('duel-history-finished').or(page.getByTestId('history-empty')),
    ).toBeVisible();

    const playTab = page.getByTestId('duel-tab-play');
    await expect(playTab).toBeVisible();
    await playTab.click();
    await expect(page.getByTestId('duel-category-list')).toBeVisible();

    // 3. Modes: Human and Solo, no bot, no Elo
    const humanMode = page.getByTestId('duel-mode-human');
    const soloMode = page.getByTestId('duel-mode-solo');
    await expect(humanMode).toBeVisible();
    await expect(soloMode).toBeVisible();

    // Switch to Solo mode
    await soloMode.click();
    await expect(page.getByTestId('duel-solo-note')).toBeVisible();

    // 4. Play a SOLO match to result screen
    await page.getByTestId('duel-start-cta').click();

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

    // 5. Weekly overall ranking only
    await page.getByTestId('duel-open-rankings').click();
    await expect(page.getByTestId('screen-duel-rankings')).toBeVisible();
    await expect(
      page.getByTestId('rankings-list').or(page.getByTestId('rankings-empty')),
    ).toBeVisible();

    // Go back from rankings
    await page.getByTestId('rankings-back').click();
    await expect(page.getByTestId('screen-duel')).toBeVisible();
  });
});
