/// <reference types="node" />
import { expect, test } from '@playwright/test';

import { resetOnboarding } from '../e2e/app';
import { ClipRecorder } from './clips';
import { act, beat, CLIP_SIZE, onboardToFirstLesson, playDuel, playLesson, stubJev, tap, today, TOUCH_RINGS } from './journey';

/**
 * Demo recording of Alex's journey for the pitch: Bank → Learn → onboarding with the Quick check →
 * a lesson picked on the globe → a quiz duel against a bot. Not a test: run it with `make record`.
 * Every step is its own clip in recordings/out/ (01-bank-to-learn.mp4, 02-onboarding.mp4, …, 07-duel.mp4).
 *
 * By default the Jev steps are stubbed, so every take shows the same answers and the same summary.
 * REAL_JEV=1 sends the answers to the real backend instead (needs JEV_API_KEY in .env).
 */
const REAL_JEV = process.env.REAL_JEV === '1';
/** Relative to front/, where `make record` runs Playwright. */
const OUT_DIR = 'recordings/out';

let clips: ClipRecorder | undefined;

test.beforeAll(async ({ request }) => {
  await resetOnboarding(request);
  // Clears completed lessons (and restores the demo streak), so berlin-1 ends with new XP, not "Already completed".
  const reset = await request.post(`/api/users/demo-user/progress/reset?today=${today()}`);
  expect(reset.ok()).toBe(true);
  // Lessons open in video mode (the default for new users); a mode switched in an earlier take is remembered.
  const mode = await request.put('/api/users/demo-user/lesson-mode', { data: { mode: 'video' } });
  expect(mode.ok()).toBe(true);
});

test('Alex: Learn, onboarding, the globe, a whole lesson, a duel', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const rec = (clips = new ClipRecorder(page, OUT_DIR, CLIP_SIZE));
  await page.addInitScript(TOUCH_RINGS);
  if (!REAL_JEV) await stubJev(page);

  await onboardToFirstLesson(page, rec, { realJev: REAL_JEV });

  // 6. The whole first lesson, in video mode: "Safe money that shrinks" (inflation and real return).
  await rec.start('06-lesson');
  await playLesson(page);
  await expect(page.getByTestId('lesson-end')).toBeVisible();
  await beat(page, 4000); // XP and the concepts learned
  await tap(page, 'back-to-list', 800);
  await expect(page.getByTestId('screen-story')).toBeVisible();
  await beat(page, 1500); // lesson 1 now shows as completed
  await rec.stop();
  await page.goBack();
  await expect(page.getByTestId('screen-learn')).toBeVisible();

  // 7. Quiz House (Duel v2): Berlin questions against a simulated rival. The rival always ends one point behind,
  // so Alex wins narrowly; his mistakes link back to the lessons that cover them.
  await rec.start('07-duel');
  await tap(page, 'nav-duel', 800);
  await expect(page.getByTestId('screen-duel')).toBeVisible();
  await expect(page.getByTestId('duel-category-berlin')).toBeVisible({ timeout: 20_000 });
  await beat(page, 2000);
  // All stories start selected; only Berlin has a question bank yet.
  for (const story of ['seoul', 'sao-paulo', 'tokyo']) {
    if (await page.getByTestId(`duel-category-${story}`).isVisible()) await tap(page, `duel-category-${story}`, 350);
  }
  await tap(page, 'duel-mode-human', 700);
  await tap(page, 'duel-start-cta', 1000);
  await playDuel(page);

  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 120_000 });
  await beat(page, 4000); // the score and XP
  await page.getByTestId('result-review').scrollIntoViewIfNeeded();
  await beat(page, 3000);
  const repeat = page.locator('[data-testid^="review-repeat-lesson-"]').first();
  await repeat.scrollIntoViewIfNeeded();
  await beat(page, 2500);
  await act(page);
  await repeat.click();
  await expect(page.getByTestId('screen-story')).toBeVisible();
  await beat(page, 3500); // the lesson to practise, highlighted on Berlin's line
  await rec.stop();
});

/** Encodes whatever was recorded, also after a failed step, so a broken take still shows where it stopped. */
test.afterEach(async () => {
  if (!clips) return;
  // Encoding the 3× frames takes a few minutes on top of the run.
  test.setTimeout(40 * 60_000);
  const files = await clips.encode();
  console.log(`\nClips:\n${files.map((f) => `  front/${f}`).join('\n')}\n`);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});