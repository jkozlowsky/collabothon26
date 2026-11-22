/// <reference types="node" />
import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { resetOnboarding } from '../e2e/app';
import { ClipRecorder } from './clips';
import { act, beat, CLIP_SIZE, onboardToFirstLesson, playDuel, playLesson, stubJev, tap, today, TOUCH_RINGS, waitForGlobe } from './journey';

/**
 * Demo recording "Berlin, from first lesson to first step": Learn and onboarding, the first recommended lesson
 * (berlin-1) with a glossary word opened on the way, then the rest of Berlin is finished off camera, the end of the
 * story (recap and the bank's products, one of them lit in the bank), and a duel won with mistakes that link back
 * to their lesson. Not a test: run it with `make record`.
 *
 * Output in recordings/out/berlin/: one clip per step (01-…mp4 to 08-duel.mp4) and all of them in one
 * berlin-first-step.mp4.
 */
const OUT_DIR = 'recordings/out/berlin';
/** The glossary word opened during the lesson: it is linked in the explanation of berlin-1's first quiz. */
const GLOSSARY_WORD = 'real-return';
/** The bank product picked at the end of Berlin: a fixed-term deposit, in Overview › Save. */
const OFFER = 'fixed-term';

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

/** Leaves only Berlin ticked in the duel lobby: it is the story with a question bank. */
async function onlyBerlin(page: Page) {
  await expect(page.getByTestId('duel-category-berlin')).toBeVisible({ timeout: 20_000 });
  const ids = await page
    .locator('[data-testid^="duel-category-"]:not([data-testid="duel-category-list"])')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!));
  for (const id of ids) {
    const checked = (await page.getByTestId(id).getAttribute('aria-checked')) === 'true';
    if (checked !== (id === 'duel-category-berlin')) await tap(page, id, 350);
  }
}

test.beforeAll(async ({ request }) => {
  await resetOnboarding(request);
  // A fresh start: no lessons done, so Berlin's offers appear only after the story is finished.
  const reset = await request.post(`/api/users/demo-user/progress/reset?today=${today()}`);
  expect(reset.ok()).toBe(true);
  const mode = await request.put('/api/users/demo-user/lesson-mode', { data: { mode: 'video' } });
  expect(mode.ok()).toBe(true);
});

test('Berlin: onboarding, a lesson with the glossary, the first step in the bank, a duel', async ({ page, request }) => {
  test.setTimeout(15 * 60_000);
  const rec = (clips = new ClipRecorder(page, OUT_DIR, CLIP_SIZE));
  await page.addInitScript(TOUCH_RINGS);
  await stubJev(page);

  // 01–05: bank → Learn → onboarding → "How we see you" → the globe → berlin-1, the first lesson recommended.
  await onboardToFirstLesson(page, rec);

  // 06: the whole first lesson; after the first quiz, a word from its explanation opens in the glossary.
  await rec.start('06-lesson');
  expect(await playLesson(page, { glossary: GLOSSARY_WORD }), `the glossary word ${GLOSSARY_WORD} was not opened`).toBe(true);
  await expect(page.getByTestId('lesson-end')).toBeVisible();
  await beat(page, 4000); // XP and the concepts learned
  await tap(page, 'back-to-list', 800);
  await expect(page.getByTestId('screen-story')).toBeVisible();
  await beat(page, 1500);
  await rec.stop();

  // Off camera: the other four Berlin lessons, then the story screen again with every stop done.
  await finishRestOfBerlin(request);
  await page.reload();
  await expect(page.getByTestId('offers-entry-open')).toBeVisible({ timeout: 60_000 });

  // 07: the end of the story: what Berlin taught, the bank's products, one of them lit in the bank.
  await rec.start('07-first-step');
  await page.getByTestId('screen-story').evaluate((el) => el.scrollTo({ top: 0 }));
  await beat(page, 2000); // five stamps on Berlin's line
  await page.getByTestId('offers-entry').scrollIntoViewIfNeeded();
  await beat(page, 2500);
  await tap(page, 'offers-entry-open', 800);
  await expect(page.getByTestId('path-recap')).toBeVisible();
  await beat(page, 6000); // what the story taught, and "Your move"
  await tap(page, 'offers-continue', 800);
  await expect(page.getByTestId(`offer-${OFFER}`)).toBeVisible();
  await beat(page, 4500); // the products, each with the lesson it connects to
  await tap(page, `offer-${OFFER}`, 1000);
  await expect(page.getByTestId('spotlight-note')).toBeVisible({ timeout: 20_000 });
  await beat(page, 4500); // the product's button lit in the bank, the rest dimmed
  await tap(page, 'spotlight-ok', 600); // the spotlight closes
  await expect(page.getByTestId('spotlight-note')).toBeHidden();
  await tap(page, `product-${OFFER}`, 800);
  await expect(page.getByTestId('product-start')).toBeVisible();
  await beat(page, 4500); // the product's terms
  await tap(page, 'product-start', 1000);
  await beat(page, 3000); // the application would start here (demo note)
  await rec.stop();

  // 08: back to Learn, a duel on Berlin against a rival; the mistakes link back to the lesson that covers them.
  // Learn opens off camera: after the reload above the globe draws again from scratch.
  await tap(page, 'nav-learn', 0);
  await waitForGlobe(page);
  await rec.start('08-duel');
  await beat(page, 1500);
  await tap(page, 'nav-duel', 800);
  await expect(page.getByTestId('screen-duel')).toBeVisible();
  await onlyBerlin(page);
  await tap(page, 'duel-mode-human', 700);
  await tap(page, 'duel-start-cta', 1000);
  await playDuel(page); // two mistakes on purpose (see playDuel); the rival always ends one point behind

  await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 120_000 });
  await beat(page, 4000); // the win, the score and XP
  await page.getByTestId('result-review').scrollIntoViewIfNeeded();
  await beat(page, 3000);
  const repeat = page.locator('[data-testid^="review-repeat-lesson-"]').first();
  await repeat.scrollIntoViewIfNeeded();
  await beat(page, 2500);
  await act(page);
  await repeat.click();
  // Berlin's story screen may already be lower in the stack; the new one is the visible one.
  await expect(page.getByTestId('screen-story').filter({ visible: true }).last()).toBeVisible();
  await beat(page, 3500); // the lesson to practise, highlighted on Berlin's line
  await rec.stop();
});

/** Encodes the clips, also after a failed step, then joins them into one film. */
test.afterEach(async () => {
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
