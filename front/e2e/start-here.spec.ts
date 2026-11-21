import { expect, test, type Page } from '@playwright/test';

import { goToInvite, openApp, passConsent, resetOnboarding, tap } from './app';
import { categorization } from '../src/test-utils/categorization';

const CATEGORIZATION_URL = '**/api/users/demo-user/categorization';
const row = (lessonId: number | null, patch: object = {}) =>
  categorization({
    profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
    mastery: { saving: 0.5 },
    startHere: lessonId === null ? null : { lessonId, title: `Lesson ${lessonId}`, area: 'saving' },
    ...patch,
  });

test.beforeEach(async ({ request }) => {
  await resetOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

/** The POST of onboarding's categorisation answers `stored`; reads answer through `current`. */
async function toMap(page: Page, current: { get: () => { status: number; json?: object } }) {
  await openApp(page);
  await page.route(CATEGORIZATION_URL, (route) => {
    if (route.request().method() === 'POST') return route.fulfill({ json: row(null) });
    const { status, json } = current.get();
    return route.fulfill({ status, json });
  });
  await goToInvite(page);
  await tap(page, 'onboarding-skip-all');
  await passConsent(page);
}

test('the badge and its why line show on the startHere lesson only', async ({ page }) => {
  await toMap(page, { get: () => ({ status: 200, json: row(2) }) });
  await expect(page.getByTestId('start-here')).toHaveCount(1);
  await expect(page.getByTestId('lesson-2').getByTestId('start-here')).toBeVisible();
  await expect(page.getByTestId('lesson-1').getByTestId('start-here')).toHaveCount(0);
  await expect(page.getByTestId('why-here')).toHaveText('Why here: Your answers about Saving');
});

test('no stored categorisation leaves the list as it is', async ({ page }) => {
  await toMap(page, { get: () => ({ status: 404 }) });
  await expect(page.getByTestId(/^lesson-/).first()).toBeVisible();
  await expect(page.getByTestId('start-here')).toHaveCount(0);
});

test('after a stubbed completion the badge is on the next lesson when the map is focused again', async ({ page }) => {
  let startAt = 2;
  await toMap(page, { get: () => ({ status: 200, json: row(startAt) }) });
  await expect(page.getByTestId('lesson-2').getByTestId('start-here')).toBeVisible();

  startAt = 3;
  await tap(page, 'nav-glossary');
  await tap(page, 'nav-map');
  await expect(page.getByTestId('lesson-3').getByTestId('start-here')).toBeVisible();
  await expect(page.getByTestId('start-here')).toHaveCount(1);
});
