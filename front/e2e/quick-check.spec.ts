import { expect, test, type Page } from '@playwright/test';

import { goToInvite, openApp, resetOnboarding, tap } from './app';
import { categorization } from '../src/test-utils/categorization';
import { POOL } from '../src/test-utils/checkPool';

const INTRO = 'Four quick questions so we know where to start. There are no wrong answers.';
const CATEGORIZATION_URL = '**/api/users/demo-user/categorization';

test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

/** The backend has no Jev key in CI: the pool is served by a stub and the judging POST answers with `reply`. */
async function stubQuickCheck(page: Page, pool: unknown[], reply: unknown) {
  const posts: { consent: boolean; answers?: { questionId: string; text: string | null }[] }[] = [];
  await page.route('**/api/check-questions', (route) => route.fulfill({ json: pool }));
  await page.route(CATEGORIZATION_URL, (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    posts.push(route.request().postDataJSON());
    return route.fulfill({ json: reply });
  });
  return posts;
}

/** Registered after openApp, so these stubs win over its empty pool. */
async function toConsentCard(page: Page, pool: unknown[], reply: unknown) {
  await openApp(page);
  const posts = await stubQuickCheck(page, pool, reply);
  await goToInvite(page);
  await tap(page, 'onboarding-skip-all');
  return posts;
}

test('consent, four questions, the summary, then the first lesson', async ({ page }) => {
  const reply = categorization({ startLesson: { lessonId: 1, title: 'Emergency fund' } });
  const posts = await toConsentCard(page, POOL, reply);
  await expect(page.getByTestId('consent-quickcheck-note')).toBeVisible();
  await tap(page, 'consent-accept');

  await expect(page.getByTestId('quick-check')).toBeVisible();
  await expect(page.getByText(INTRO)).toBeVisible();
  await expect(page.getByTestId('quick-check').getByText('1 of 4', { exact: true })).toBeVisible();
  await expect(page.getByTestId('quick-check-next')).toHaveAttribute('aria-disabled', 'true');
  await page.getByTestId('quick-check-input').fill('Interest keeps growing.');
  await tap(page, 'quick-check-next');

  await expect(page.getByTestId('quick-check').getByText('2 of 4', { exact: true })).toBeVisible();
  await expect(page.getByTestId('quick-check-prompt')).toBeFocused();
  await tap(page, 'quick-check-back');
  await expect(page.getByTestId('quick-check-input')).toHaveValue('Interest keeps growing.');
  await tap(page, 'quick-check-next');
  // Next and "Not sure" wait a moment after each question appears.
  await expect(page.getByTestId('quick-check-unsure')).toBeEnabled();
  await tap(page, 'quick-check-unsure');
  await page.getByTestId('quick-check-input').fill('One failing hurts less.');
  await tap(page, 'quick-check-next');
  await page.getByTestId('quick-check-input').fill('It can fall and recover.');
  await tap(page, 'quick-check-next');

  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('You know more than you think')).toBeVisible();
  await expect(page.getByText("You're an intermediate learner")).toBeVisible();
  await expect(page.getByTestId('summary-start')).toHaveText('Start learning');
  await expect(page.getByTestId('learning-path').getByText('Emergency fund')).toBeVisible();

  expect(posts).toHaveLength(1);
  expect(posts[0].consent).toBe(true);
  expect(posts[0].answers).toHaveLength(4);
  expect(posts[0].answers?.map((a) => a.text)).toEqual([
    'Interest keeps growing.',
    null,
    'One failing hurts less.',
    'It can fall and recover.',
  ]);
  expect(JSON.stringify(posts[0])).not.toMatch(/12,?500|1,?640/);

  await tap(page, 'summary-start');
  await expect(page).toHaveURL(/\/lesson\/1$/);
});

test('without a Jev key the questions are skipped and consent leads straight to the summary', async ({ page }) => {
  const fallback = categorization({ source: 'fallback', checks: [], startLesson: null, confidenceGaps: [] });
  const posts = await toConsentCard(page, [], fallback);
  await expect(page.getByTestId('consent-quickcheck-note')).toHaveCount(0);
  await tap(page, 'consent-decline');

  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('quick-check')).toHaveCount(0);
  expect(posts).toEqual([{ consent: false }]);

  await tap(page, 'summary-start');
  await expect(page.getByTestId('screen-learn')).toBeVisible();
});
