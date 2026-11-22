/// <reference types="node" />
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { pickAlex, resetOnboarding } from '../e2e/app';
import { ClipRecorder } from './clips';
import {
  act,
  beat,
  CLIP_SIZE,
  correctOption,
  DUEL_STORIES,
  glide,
  ORDER,
  playDuel,
  playLesson,
  stubJev,
  tap,
  today,
  TOUCH_RINGS,
  waitForGlobe,
} from './journey';

/**
 * Demo recording "Berlin, from first lesson to first step". Not a test: run it with `make record`.
 *
 *  0. (off camera) Alex signs in.
 *  1. The bank: Atlas's notification shows, runs out and drops into the Learn button.
 *  2. Atlas's onboarding up to "How we see you", which must start in Berlin (else the step is filmed again).
 *  3. The globe: the "Start here" story (Berlin), its path, up to the "Start mission" button.
 *  4. The lesson: the video with the transcript opened halfway through the first scene, the steps, a glossary word
 *     opened in Myth or fact, up to "Lesson complete" and the XP.
 *  5. Back to the path, scrolled slowly to the lessons still ahead.
 *  6. (off camera) The other four Berlin lessons are finished, as if played in between.
 *  7. "Take the first step": the recap, the bank's products, the fixed-term deposit lit in the bank, its terms, then
 *     the bank's main screen.
 *  8. A duel on Berlin and Seoul against a rival, won with two mistakes.
 *  9. The review: the Berlin mistake opens its lesson (done), the Seoul one a lesson that is still locked.
 * 10. Back to the duel lobby and the overall ranking.
 *
 * Output in recordings/out/berlin/: one clip per step (01-…mp4 to 10-rankings.mp4) and all of them in one
 * berlin-first-step.mp4.
 */
const OUT_DIR = 'recordings/out/berlin';
/** The glossary word opened in Myth or fact: it is underlined in the explanation once every card is sorted. */
const GLOSSARY_WORD = 'inflation';
/** The bank product picked at the end of Berlin: a fixed-term deposit, in Overview › Save. */
const OFFER = 'fixed-term';
/** How many times step 2 may be filmed until the summary starts in Berlin. */
const MAX_ONBOARDING_TAKES = 3;
/** The device id the recording signs in with (lib/session.ts keeps it in localStorage). */
const RECORDING_DEVICE_ID = 'demo-recording';
/** How long the result screen may take to show the level-up overlay (ResultView: the XP bars, then a gap). */
const LEVEL_UP_WAIT_MS = 10_000;

let clips: ClipRecorder | undefined;

/** Finishes berlin-2 to berlin-5 through the API, all answers right, as if played in between. */
async function finishRestOfBerlin(request: APIRequestContext) {
  for (const id of ['berlin-2', 'berlin-3', 'berlin-4', 'berlin-5']) {
    const lesson = JSON.parse(readFileSync(path.resolve(`../back/src/main/resources/content/lessons/${id}.json`), 'utf8')) as {
      steps: { id: string; type: string }[];
    };
    const graded = lesson.steps.filter((s) => ['quiz', 'match', 'sort', 'predict', 'scenario', 'slider-chart'].includes(s.type));
    const res = await request.post(`/api/lessons/${id}/result?userId=demo-user`, {
      data: {
        steps: graded.map((s) => ({ stepId: s.id, correctFirstTry: true })),
        scenarioChoices: Object.fromEntries(graded.filter((s) => s.type === 'scenario').map((s) => [s.id, 0])),
        mode: 'video',
        completedOn: today(),
      },
    });
    expect(res.ok(), `${id}: ${await res.text()}`).toBe(true);
  }
}

/** Opens the app on the bank as Alex (the account picker opens on every start, a reload included). */
async function signIn(page: Page) {
  await page.goto('/');
  await pickAlex(page);
  await expect(page.getByTestId('screen-overview')).toBeVisible({ timeout: 120_000 });
}

/** Atlas's notification on the bank: it shows, its timer runs out and it drops into the Learn button. */
async function notificationDropsIntoLearn(page: Page) {
  const nudge = page.getByTestId('fq-teaser-home');
  await expect(nudge).toBeVisible({ timeout: 20_000 });
  await expect(nudge).toBeHidden({ timeout: 20_000 });
  await expect(page.getByTestId('nav-learn-dot')).toBeVisible();
}

/** Learn → onboarding → the Quick check → "How we see you". Returns whether the first stop is in Berlin. */
async function onboard(page: Page): Promise<boolean> {
  await tap(page, 'nav-learn', 800);
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();
  await beat(page, 2500);
  await tap(page, 'onboarding-start');
  await expect(page.getByTestId('onboarding-intro')).toBeVisible();
  await beat(page, 2500);
  await tap(page, 'onboarding-next');
  await expect(page.getByTestId('onboarding-challenge')).toBeVisible();
  await beat(page, 2500);
  await tap(page, 'onboarding-challenge-next');
  await expect(page.getByTestId('onboarding-consent')).toBeVisible();
  await beat(page, 3000);
  await tap(page, 'consent-accept');
  // What the money is for, and when: a flat in 2–3 years → "1–5 years".
  await tap(page, 'option-home', 1000);
  await tap(page, 'onboarding-continue');
  await tap(page, 'option-1-5y', 1000);
  await tap(page, 'onboarding-continue');

  // The Quick check: after each answer the right one shows with the lesson's explanation.
  await expect(page.getByTestId('onboarding-check-intro')).toBeVisible({ timeout: 20_000 });
  await beat(page, 2000);
  await tap(page, 'check-start');
  const answer = async (testId: string) => {
    await beat(page, 2500); // reading the question
    await tap(page, testId);
    await beat(page, 3000); // the right answer and why
    await tap(page, 'quick-check-continue', 300);
  };
  // Real return: Alex mixes it up. Emergency fund: right. A share that fell by half: not sure.
  await answer(`quick-check-option-${correctOption(ORDER[0]) + 1}`);
  await answer(`quick-check-option-${correctOption(ORDER[1])}`);
  await answer('quick-check-unsure');

  // "How we see you": the level, then slowly down to the first stop.
  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 30_000 });
  await beat(page, 3000);
  const first = page.getByTestId('summary-first-lesson');
  await glide(page, first);
  await beat(page, 3000);
  return (await first.innerText()).includes('Berlin');
}

/** Leaves exactly `stories` ticked in the duel lobby. */
async function pickCategories(page: Page, stories: string[]) {
  await expect(page.getByTestId('duel-category-berlin')).toBeVisible({ timeout: 20_000 });
  const ids = await page
    .locator('[data-testid^="duel-category-"]:not([data-testid="duel-category-list"])')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!));
  for (const id of ids) {
    const checked = (await page.getByTestId(id).getAttribute('aria-checked')) === 'true';
    if (checked !== stories.includes(id.replace('duel-category-', ''))) await tap(page, id, 350);
  }
}

/** Opens the review card of the mistake on question `index` (0-based) and follows its lesson link. */
async function openMistake(page: Page, index: number) {
  await tap(page, `review-mistake-${index}`, 800);
  await beat(page, 3500); // the explanation and where the lesson is
  await tap(page, `review-repeat-lesson-${index}`, 800);
}

test.beforeAll(async ({ request }) => {
  await resetOnboarding(request);
  // A fresh start: no lessons done, so Berlin's offers appear only after the story is finished.
  const reset = await request.post(`/api/users/demo-user/progress/reset?today=${today()}`);
  expect(reset.ok()).toBe(true);
  // Lessons open in video mode; a mode switched in an earlier take is remembered.
  const mode = await request.put('/api/users/demo-user/lesson-mode', { data: { mode: 'video' } });
  expect(mode.ok()).toBe(true);
});

test('Berlin: from the bank notification to the first step, a duel and the ranking', async ({ page, request }) => {
  test.setTimeout(25 * 60_000);
  const rec = (clips = new ClipRecorder(page, OUT_DIR, CLIP_SIZE));
  await page.addInitScript(TOUCH_RINGS);
  // Every take signs in from the same device, so Alex's lock left by an earlier take (it lives 2 minutes) is its own.
  await page.addInitScript((id) => window.localStorage.setItem('fq_device_id', id), RECORDING_DEVICE_ID);
  await stubJev(page);

  // 0. Off camera: sign in as Alex.
  await signIn(page);
  // The bank renders at 412 CSS px; a wider value means the 3× rendering broke the mobile layout.
  expect(await page.evaluate(() => window.innerWidth)).toBe(412);

  // 1. The bank and Atlas's notification, until it drops into the Learn button.
  await rec.start('01-bank-notification');
  await notificationDropsIntoLearn(page);
  await beat(page, 1500);

  // 2. Onboarding up to the summary; filmed again until the summary starts in Berlin.
  for (let take = 1; ; take++) {
    await rec.start('02-onboarding');
    if (await onboard(page)) break;
    expect(take, 'the summary never started in Berlin').toBeLessThan(MAX_ONBOARDING_TAKES);
    await rec.discard();
    await resetOnboarding(request);
    await signIn(page);
    await notificationDropsIntoLearn(page);
  }
  await tap(page, 'summary-start');
  await rec.stop();

  // 3. The globe, filmed once it is drawn (the first WebGL frame takes a few seconds): the "Start here" story,
  // which must be Berlin, its path, and the first lesson's "Start mission".
  await waitForGlobe(page);
  await rec.start('03-start-here');
  await beat(page, 2500);
  await expect(page.getByTestId('story-card-berlin').getByTestId('story-card-start-here')).toBeVisible();
  await tap(page, 'story-card-berlin', 800);
  await expect(page.getByTestId('callout-start-here')).toBeVisible();
  await beat(page, 2500); // the globe flies to Berlin
  await tap(page, 'pin-callout-open', 1200);
  await expect(page.getByTestId('screen-story')).toBeVisible();
  const startMission = page.getByTestId('lesson-berlin-1');
  await expect(startMission).toHaveText(/Start mission/);
  await glide(page, startMission);
  await beat(page, 2500);

  // 4. The whole first lesson.
  await rec.start('04-lesson');
  await tap(page, 'lesson-berlin-1', 600);
  expect(await playLesson(page, { glossary: GLOSSARY_WORD }), `the glossary word ${GLOSSARY_WORD} was not opened`).toBe(true);
  await expect(page.getByTestId('lesson-end')).toBeVisible();
  await expect(page.getByTestId('lesson-xp')).toBeVisible();
  await beat(page, 4500); // "Lesson complete", the XP and the concepts learned

  // 5. Back to the path, slowly down to the lessons still ahead.
  await rec.start('05-more-lessons');
  await tap(page, 'back-to-list', 800);
  const story = page.getByTestId('screen-story').filter({ visible: true }).last();
  await expect(story).toBeVisible();
  await glide(page, story, 'end');
  await beat(page, 2500);
  await rec.stop();

  // 6. Off camera: the other four Berlin lessons, then Berlin's path again with every stop done. The reload opens
  // the bank first, so its notification is out of the way and the globe is drawn before step 8 comes back to it.
  await finishRestOfBerlin(request);
  await signIn(page);
  await notificationDropsIntoLearn(page).catch(() => {}); // after Berlin there may be no notification
  await page.getByTestId('nav-learn').click();
  await waitForGlobe(page);
  await page.getByTestId('story-card-berlin').click();
  await page.getByTestId('pin-callout-open').click();
  await expect(page.getByTestId('offers-entry-open')).toBeVisible({ timeout: 60_000 });
  await story.evaluate((el) => el.scrollTo({ top: 0 }));

  // 7. The end of the line: what Berlin taught, the bank's products, the fixed-term deposit in the bank.
  await rec.start('07-first-step');
  await beat(page, 2000); // five stamps on Berlin's line
  await tap(page, 'offers-entry-open', 800);
  await expect(page.getByTestId('path-recap')).toBeVisible();
  await beat(page, 6000); // what the story taught, and "Your move"
  await tap(page, 'offers-continue', 800);
  await expect(page.getByTestId(`offer-${OFFER}`)).toBeVisible();
  await beat(page, 4000); // the products, each with the lesson it connects to
  await tap(page, `offer-${OFFER}`, 1000);
  await expect(page.getByTestId('spotlight-note')).toBeVisible({ timeout: 20_000 });
  await beat(page, 4500); // the product's button lit in the bank, the rest dimmed
  await tap(page, 'spotlight-ok', 600);
  await expect(page.getByTestId('spotlight-note')).toBeHidden();
  await tap(page, `product-${OFFER}`, 800);
  await expect(page.getByTestId('product-start')).toBeVisible();
  await beat(page, 5000); // the terms
  await tap(page, 'sheet-close', 600);
  await expect(page.getByTestId('detail-sheet')).toBeHidden();
  await expect(page.getByTestId('screen-overview')).toBeVisible();
  await beat(page, 2500);

  // 8. Back to Atlas, a duel on Berlin and Seoul against a rival, two mistakes on purpose (see playDuel).
  await rec.start('08-duel');
  await tap(page, 'nav-learn', 800);
  await waitForGlobe(page);
  await beat(page, 1500);
  await tap(page, 'nav-duel', 800);
  await expect(page.getByTestId('screen-duel')).toBeVisible();
  await pickCategories(page, DUEL_STORIES);
  await tap(page, 'duel-mode-human', 700);
  await tap(page, 'duel-start-cta', 1000);
  const mistakes = await playDuel(page);
  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 120_000 });
  await beat(page, 4000); // the win, the score and XP
  // A category that levelled up gets an overlay once the XP bars have filled (a few seconds after the result shows).
  // Each tap moves on to the next category or closes it.
  const levelUp = page.getByTestId('level-up-overlay');
  await levelUp.waitFor({ state: 'visible', timeout: LEVEL_UP_WAIT_MS }).catch(() => {});
  while (await levelUp.isVisible()) {
    await beat(page, 3000);
    await act(page);
    await levelUp.click();
    await page.waitForTimeout(800); // the next category, or the overlay fading out
  }
  await beat(page, 1500);

  // 9. The review: slowly down to the mistakes, then each one's lesson: Berlin's is done, Seoul's still locked.
  await rec.start('09-review');
  await glide(page, page.getByTestId('review-wrong-title'));
  await beat(page, 2500);
  await openMistake(page, mistakes.open);
  // The path loads before its stops show; the pause starts once they are there.
  await expect(page.locator('[data-testid^="lesson-berlin-"]').filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  await beat(page, 4000); // the lesson, highlighted on Berlin's line
  await page.goBack();
  await expect(page.getByTestId('duel-result')).toBeVisible();
  await beat(page, 1500);
  await openMistake(page, mistakes.locked);
  await expect(page.getByTestId('story-locked-sheet')).toBeVisible({ timeout: 20_000 });
  await beat(page, 4500); // "lesson locked" and which lesson opens it
  await tap(page, 'story-locked-close', 600);
  await beat(page, 1500);
  await page.goBack();
  await expect(page.getByTestId('duel-result')).toBeVisible();

  // 10. Back to the duel lobby and the overall ranking.
  await rec.start('10-rankings');
  await beat(page, 1000);
  await tap(page, 'result-back-lobby', 800);
  await expect(page.getByTestId('screen-duel')).toBeVisible();
  await beat(page, 1500);
  await tap(page, 'duel-open-rankings', 800);
  await expect(page.getByTestId('screen-duel-rankings')).toBeVisible();
  await beat(page, 2000);
  await glide(page, page.getByTestId('rankings-scroll'), 'end');
  await beat(page, 3000);
  await rec.stop();
});

/** Frees Alex for other devices, encodes the clips (also after a failed step), then joins them into one film. */
test.afterEach(async ({ page, request }) => {
  await clips?.stop();
  // Closed before the lock is freed: an open page keeps renewing it with its heartbeat.
  await page.close();
  await request.delete(`/api/users/demo-user/session?deviceId=${RECORDING_DEVICE_ID}`).catch(() => {});
  if (!clips) return;
  test.setTimeout(40 * 60_000);
  const files = await clips.encode();
  console.log(`\nClips:\n${files.map((f) => `  front/${f}`).join('\n')}\n`);
  const film = joinClips(files);
  if (film) console.log(`Whole take: front/${film}\n`);
});

test.afterAll(async ({ request }) => {
  await resetOnboarding(request);
});

/** Joins same-format clips without re-encoding (ffmpeg concat). Returns the file, or null when it could not. */
function joinClips(files: string[]): string | null {
  if (files.length < 2) return null;
  const ext = path.extname(files[0]);
  const list = path.join(OUT_DIR, 'clips.txt');
  writeFileSync(list, files.map((f) => `file '${path.resolve(f)}'`).join('\n'));
  const out = path.join(OUT_DIR, `berlin-first-step${ext}`);
  const run = spawnSync(process.env.FFMPEG ?? 'ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], {
    stdio: 'inherit',
  });
  return run.status === 0 ? out : null;
}
