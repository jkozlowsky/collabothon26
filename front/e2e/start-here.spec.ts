import { expect, test, type Page } from './fixtures';

import { expectOnLearn, openApp, resetOnboarding, skipOnboarding, tap } from './app';
import { categorization } from '../src/test-utils/categorization';

const CATEGORIZATION_URL = '**/api/users/demo-user/categorization';
const lesson = (storyId: string, storyCity: string) => ({ lessonId: `${storyId}-1`, title: 'First stop', area: 'saving' as const, storyId, storyCity });
const row = (storyId: string | null, patch: object = {}) =>
  categorization({
    profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
    mastery: { saving: 0.5 },
    startHere: storyId === null ? null : lesson(storyId, storyId === 'berlin' ? 'Berlin' : 'Seoul'),
    ...patch,
  });

test.beforeEach(async ({ request }) => {
  await skipOnboarding(request);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

/** Onboarding is already skipped (beforeEach); the stored categorisation is read through `current`. */
async function toMap(page: Page, current: { get: () => { status: number; json?: object } }) {
  await page.route(CATEGORIZATION_URL, (route) => {
    const { status, json } = current.get();
    return route.fulfill({ status, json });
  });
  await openApp(page);
  await expectOnLearn(page);
}

test('the badge and its why line show on the startHere story card only', async ({ page }) => {
  await toMap(page, { get: () => ({ status: 200, json: row('berlin') }) });
  await expect(page.getByTestId('story-card-start-here')).toHaveCount(1);
  await expect(page.getByTestId('story-card-berlin').getByTestId('story-card-start-here')).toBeVisible();
  await expect(page.getByTestId('story-card-seoul').getByTestId('story-card-start-here')).toHaveCount(0);
  await expect(page.getByTestId('story-card-why-here')).toHaveText('Based on your onboarding answers');
  // The globe turns to the story and its callout carries the same cue.
  await expect(page.getByTestId('callout-start-here')).toBeVisible();
  await expect(page.getByTestId('callout-why-here')).toHaveText('Based on your onboarding answers');
});

test('no stored categorisation leaves the sheet as it is', async ({ page }) => {
  await toMap(page, { get: () => ({ status: 404 }) });
  await expect(page.getByTestId('story-card-berlin')).toBeVisible();
  await expect(page.getByTestId('story-card-start-here')).toHaveCount(0);
});

test('after a stubbed completion the badge is on the next story when the map is focused again', async ({ page }) => {
  let storyId = 'berlin';
  await toMap(page, { get: () => ({ status: 200, json: row(storyId) }) });
  await expect(page.getByTestId('story-card-berlin').getByTestId('story-card-start-here')).toBeVisible();

  storyId = 'seoul';
  await tap(page, 'nav-glossary');
  await tap(page, 'nav-map');
  await expect(page.getByTestId('story-card-seoul').getByTestId('story-card-start-here')).toBeVisible();
  await expect(page.getByTestId('story-card-start-here')).toHaveCount(1);
});
