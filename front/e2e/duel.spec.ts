import { expect, type Page, test } from './fixtures';

import { openApp, resetOnboarding, skipOnboarding } from './app';

const CATEGORY_SLUGS = ['money-basics', 'saving', 'borrowing', 'investing', 'risk'] as const;

test.beforeEach(async ({ request }) => {
  await skipOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

/** Onboarding is already skipped (beforeEach): open the app, go to Learn, then Duel. */
async function openDuelLobby(page: Page) {
  await openApp(page);
  await expect(page.getByTestId('screen-learn')).toBeVisible();
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
    const sortView = page.getByTestId('duel-sort');
    const matchView = page.getByTestId('duel-match');

    await expect(
      quizOption
        .or(predictSubmit)
        .or(chartSubmit)
        .or(sortView)
        .or(matchView)
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    if (await quizOption.isVisible()) {
      await quizOption.click();
    } else if (await predictSubmit.isVisible()) {
      await predictSubmit.click();
    } else if (await chartSubmit.isVisible()) {
      await chartSubmit.click();
    } else if (await sortView.isVisible()) {
      // Put every card in the left bucket; correctness does not matter here.
      const leftArrows = page.locator('[data-testid^="duel-sort-left-"]');
      while ((await leftArrows.count()) > 0) {
        await leftArrows.first().click();
      }
      await page.getByTestId('duel-sort-submit').click();
    } else if (await matchView.isVisible()) {
      const lefts = page.locator('[data-testid^="match-left-"]');
      const count = await lefts.count();
      for (let i = 0; i < count; i++) {
        await page.getByTestId(`match-left-${i}`).click();
        await page.getByTestId(`match-right-${i}`).click();
      }
      await page.getByTestId('duel-match-submit').click();
    }

    // Wait for server feedback and the next question / see results button
    const nextBtn = page.getByTestId('duel-next-question');
    await expect(nextBtn).toBeVisible({ timeout: 20_000 });
    await nextBtn.click();
  }
}

test.describe('Duel flow', () => {
  test('duel lobby shows area categories, history tile, human and solo modes, plays a solo match, and views weekly rankings', async ({ page }) => {
    test.setTimeout(300_000);
    await openDuelLobby(page);

    // 1. Lobby checks: the 5 area categories; the first 4 (the match limit) start selected
    for (const slug of CATEGORY_SLUGS) {
      await expect(page.getByTestId(`duel-category-${slug}`)).toBeVisible();
    }
    await expect(page.getByTestId('duel-category-counter')).toHaveText('4 / 4');
    await expect(page.getByTestId('duel-start-cta')).toBeEnabled();

    // 2. History tile opens the history screen
    await page.getByTestId('duel-open-history').click();
    await expect(page.getByTestId('screen-duel-history')).toBeVisible();
    await expect(
      page.getByTestId('duel-history-finished').or(page.getByTestId('history-empty')).or(page.getByTestId('duel-history-pending')).first(),
    ).toBeVisible();
    await page.getByTestId('history-back').click();
    await expect(page.getByTestId('screen-duel')).toBeVisible();

    // 3. Modes: Human and Solo tiles
    const humanMode = page.getByTestId('duel-mode-human');
    const soloMode = page.getByTestId('duel-mode-solo');
    await expect(humanMode).toBeVisible();
    await expect(soloMode).toBeVisible();
    await soloMode.click();
    await expect(page.getByTestId('duel-mode-solo-check')).toBeVisible();

    await expect(page.getByTestId('duel-start-cta')).toContainText('Start solo');

    // 4. Narrow to one category (deselect 3 of the 4 defaults) and play a SOLO match to the result screen
    for (const slug of ['saving', 'borrowing', 'investing']) {
      await page.getByTestId(`duel-category-${slug}`).click();
    }
    await expect(page.getByTestId('duel-category-counter')).toHaveText('1 / 4');
    await expect(page.getByTestId('duel-start-cta')).toContainText('Start solo · 1 category');
    await page.getByTestId('duel-start-cta').click();

    await playMatchQuestions(page);

    // Result screen: solo gives no XP, only a practice note
    await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('result-practice-card')).toBeVisible();

    // Review: collapsed Wrong / Correct groups; expanding one shows its cards
    const reviewCard = page.getByTestId('result-review');
    await expect(reviewCard).toBeVisible();
    const wrongToggle = page.getByTestId('toggle-wrong-review');
    const correctToggle = page.getByTestId('toggle-correct-review');
    await expect(wrongToggle.or(correctToggle).first()).toBeVisible();
    if (await wrongToggle.isVisible()) {
      await expect(wrongToggle).toContainText(/Wrong answers \(\d+\)/);
      await wrongToggle.click();
      await expect(reviewCard.locator('[data-testid^="review-mistake-"]').first()).toBeVisible();
    }
    if (await correctToggle.isVisible()) {
      await expect(correctToggle).toContainText(/Correct answers \(\d+\)/);
      await correctToggle.click();
      await expect(reviewCard.locator('[data-testid^="review-correct-"]').first()).toBeVisible();
    }

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
