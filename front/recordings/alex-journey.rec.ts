/// <reference types="node" />
import { readFileSync } from 'fs';
import path from 'path';

import { expect, test, type Page } from '@playwright/test';

import { categorization } from '../src/test-utils/categorization';
import { POOL } from '../src/test-utils/checkPool';
import { resetOnboarding } from '../e2e/app';
import { ClipRecorder } from './clips';
import { loadDuelBank, normalise } from './duelAnswers';

/**
 * Demo recording of Alex's journey for the pitch: Bank → Learn → onboarding with the Quick check →
 * a lesson picked on the globe → a quiz duel against a bot. Not a test: run it with `make record`.
 * Every step is its own clip in recordings/out/ (01-bank-to-learn.mp4, 02-onboarding.mp4, …, 07-duel.mp4).
 *
 * By default the Jev steps are stubbed, so every take shows the same answers and the same summary.
 * REAL_JEV=1 sends the answers to the real backend instead (needs JEV_API_KEY in .env).
 */
const REAL_JEV = process.env.REAL_JEV === '1';
/** Multiplies every pause; PACE=0.5 for a quick dry run, PACE=1.5 for a slower take. */
const PACE = Number(process.env.PACE ?? 1);
/** Relative to front/, where `make record` runs Playwright. */
const OUT_DIR = 'recordings/out';
/** The clip size: the Pixel 7 viewport (412×839) at the 3× the config renders at. */
const CLIP_SIZE = { width: 1236, height: 2516 };

/** The lesson Alex plays, read from the backend content: its title and the right quiz options. */
const LESSON = (() => {
  const raw = JSON.parse(readFileSync(path.resolve('../back/src/main/resources/content/lessons/berlin-1.json'), 'utf8')) as {
    title: string;
    steps: { type: string; options?: string[]; correctIndex?: number }[];
  };
  const correct = new Set(raw.steps.filter((st) => st.type === 'quiz').map((st) => normalise(st.options![st.correctIndex!])));
  return { title: raw.title, correct };
})();

const CATEGORIZATION_URL = '**/api/users/demo-user/categorization';
/** Jev asks these one by one after the time-frame question; three answers are enough to place Alex. */
const ORDER = ['inflation-real-value', 'emergency-cushion-purpose', 'time-in-market'];
const MASTERY = { saving: 0.35, investing: 0.25 };

/** What Jev "concludes" about Alex: saves regularly, invests timidly, mixes up real interest. */
const ALEX = categorization({
  role: 'novice',
  focusAreas: ['saving', 'investing'],
  confidenceGaps: [
    {
      area: 'investing',
      direction: 'under',
      because: 'You said: I save and invest. Money goes into an ETF every month, but you rated yourself as guessing.',
    },
  ],
  explanation: [
    { output: 'role', probabilities: {}, because: ['You save regularly and keep a solid safety net.', 'Real interest is still new to you.'] },
    { output: 'focusAreas', probabilities: {}, because: ['Your goal is a home in 2–3 years.', 'You picked saving and ETFs as goals.'] },
  ],
  profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
  mastery: MASTERY,
  confidence: { saving: 0.25, investing: 0.25 },
  answerCount: 3,
  startLesson: { lessonId: 'berlin-1', title: LESSON.title, area: 'saving', storyId: 'berlin', storyCity: 'Berlin' },
  startHere: { lessonId: 'berlin-1', title: LESSON.title, area: 'saving', storyId: 'berlin', storyCity: 'Berlin' },
  pathStoryIds: ['berlin'],
});

let clips: ClipRecorder | undefined;

/** A pause the viewer needs to read the screen. */
const beat = (page: Page, ms = 1200) => page.waitForTimeout(ms * PACE);

/** Every tap, drag and click waits one more second, so the audience can read the screen during the pitch. */
const ACTION_DELAY = 1000;
const act = (page: Page) => beat(page, ACTION_DELAY);

/** Taps like a person: a short look at the target, then the tap. */
async function tap(page: Page, testId: string, before = 500) {
  const target = page.getByTestId(testId);
  await expect(target).toBeVisible({ timeout: 20_000 });
  await target.scrollIntoViewIfNeeded();
  await beat(page, before);
  await act(page);
  await target.click();
}

/**
 * The video has no cursor, so every tap draws a fading ring where the finger landed.
 * Also hides two overlays that only exist in `expo start`: the LogBox toast (#error-toast) and the ⚡ Fast Refresh
 * indicator (.__expo_fast_refresh), which shows while Metro bundles a route for the first time.
 */
const TOUCH_RINGS = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = '#error-toast, .__expo_fast_refresh { display: none !important; }';
    document.head.appendChild(style);
  });
  window.addEventListener(
    'pointerdown',
    (e) => {
      const ring = document.createElement('div');
      Object.assign(ring.style, {
        position: 'fixed',
        left: `${e.clientX - 22}px`,
        top: `${e.clientY - 22}px`,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'rgba(255, 214, 0, 0.45)',
        border: '2px solid rgba(255, 214, 0, 0.9)',
        pointerEvents: 'none',
        zIndex: '2147483647',
        transition: 'transform 450ms ease-out, opacity 450ms ease-out',
      });
      document.body.appendChild(ring);
      requestAnimationFrame(() => {
        ring.style.transform = 'scale(1.6)';
        ring.style.opacity = '0';
      });
      setTimeout(() => ring.remove(), 500);
    },
    true,
  );
};

/** Stubs Jev the way e2e/quick-check.spec.ts does, so the take is the same every time. */
async function stubJev(page: Page) {
  let stored = false;
  await page.route('**/api/check-questions', (route) => route.fulfill({ json: POOL }));
  await page.route('**/quick-check/step', (route) => {
    const { history, useRules, stepFellBack } = route.request().postDataJSON() as {
      history: unknown[];
      useRules: boolean;
      stepFellBack: boolean;
    };
    const done = history.length >= ORDER.length;
    return route.fulfill({
      json: {
        mastery: history.length ? MASTERY : { saving: null, investing: null },
        nextQuestionId: done ? null : ORDER[history.length],
        done,
        useRules,
        stepFellBack,
      },
    });
  });
  await page.route(CATEGORIZATION_URL, (route) => {
    if (route.request().method() === 'POST') {
      stored = true;
      return route.fulfill({ json: ALEX });
    }
    return stored ? route.fulfill({ json: ALEX }) : route.fulfill({ status: 404 });
  });
}

/** Drags a lesson slider (components/bank/Slider) to `value`, slowly enough to be seen. */
async function drag(page: Page, testId: string, from: number, to: number, min: number, max: number) {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`${testId} has no box`);
  const THUMB = 24; // Slider.tsx
  const x = (v: number) => box.x + THUMB / 2 + ((v - min) / (max - min)) * (box.width - THUMB);
  const y = box.y + box.height / 2;
  await beat(page, 700);
  await act(page);
  await page.mouse.move(x(from), y);
  await page.mouse.down();
  await page.mouse.move(x(to), y, { steps: 25 });
  await page.mouse.up();
}

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

/**
 * Plays berlin-1 in video mode (content: back/src/main/resources/content/lessons/berlin-1.json): the scene plays,
 * then each beat's step. Steps are recognised by their testIDs, quiz answers come from the lesson file, so the
 * order of the beats can change. Alex underestimates the loss, finds the rate that keeps buying power flat, gets both
 * quizzes right, then tries a lower price rise on his own savings.
 */
async function playLesson(page: Page) {
  await expect(page.getByTestId('video-lesson')).toBeVisible({ timeout: 20_000 });
  const end = page.getByTestId('lesson-end');
  const step = (id: string) => visible(page, id);
  const done = new Set<string>();
  const next = async (before: number) => {
    await expect(step('continue')).toBeEnabled({ timeout: 20_000 });
    await beat(page, before);
    await act(page);
    await step('continue').click();
  };

  for (let guard = 0; guard < 40 && !(await end.isVisible()); guard++) {
    if (await step('predict-slider').isVisible()) {
      await beat(page, 3000); // reading the question
      await drag(page, 'predict-slider', 0, -10, -50, 0); // Alex guesses −10 %; the answer is −22 %
      await tap(page, 'predict-check', 900);
      await expect(page.getByTestId('predict-reveal')).toBeVisible();
      await next(4500);
    } else if ((await step('slider-interest').isVisible()) && !done.has('s1')) {
      done.add('s1');
      await beat(page, 3000);
      await drag(page, 'slider-interest', 0.5, 3, 0, 5); // up to the 3 % price rise
      await expect(page.getByTestId('goal-reached')).toBeVisible();
      await next(2500);
    } else if (await step('slider-inflation').isVisible()) {
      // The personal chart (his own savings rate from the bank): what if prices rose 2 % instead of 3 %.
      await beat(page, 3500);
      await drag(page, 'slider-inflation', 3, 2, 0, 8);
      await next(3000);
    } else if (await step('option-0').isVisible()) {
      const options = page.locator('[data-testid^="option-"]').filter({ visible: true });
      const texts = (await options.allInnerTexts()).map(normalise);
      const right = Math.max(0, texts.findIndex((t) => LESSON.correct.has(t)));
      await beat(page, 3000);
      await act(page);
      await options.nth(right).click();
      await expect(step('feedback')).toBeVisible();
      await next(3000);
    } else if (await step('continue').isVisible()) {
      await next(4000); // a text step
    } else {
      await page.waitForTimeout(500); // the scene is playing
    }
  }
}

/**
 * Plays the six Berlin duel questions (back/src/main/resources/content/duel/berlin.json), whatever their order.
 * After the lesson Alex gets everything about inflation right (both value questions and the inflation quiz) and the
 * matching; he misses compound interest (a later lesson) and files a child's starter fund under the emergency fund.
 */
async function playDuel(page: Page) {
  const bank = loadDuelBank();
  const question = page.getByTestId('duel-question');
  for (let q = 0; q < 6; q++) {
    await expect(question).toBeVisible({ timeout: 60_000 });
    const quiz = page.getByTestId('duel-quiz');
    const predict = page.getByTestId('duel-predict');
    const chart = page.getByTestId('duel-chart');
    const sort = page.getByTestId('duel-sort');
    const match = page.getByTestId('duel-match');
    await expect(quiz.or(predict).or(chart).or(sort).or(match).first()).toBeVisible({ timeout: 20_000 });
    await beat(page, 2500); // reading the question

    if (await quiz.isVisible()) {
      const texts = (await page.locator('[data-testid^="duel-option-"]').allInnerTexts()).map(normalise);
      const keyed = texts.map((t) => [...bank.quizOption.entries()].find(([o]) => t.includes(o))?.[1]);
      const quizId = keyed.find(Boolean)?.quiz;
      const right = keyed.findIndex((k) => k?.correct);
      if (right < 0) console.warn(`No answer key for quiz options: ${texts.join(' | ')}`);
      const knows = quizId !== 'd3'; // d3: why compound interest grows late (lesson berlin-2)
      const pick = knows ? Math.max(right, 0) : (Math.max(right, 0) + 1) % texts.length;
      await tap(page, `duel-option-${pick}`, 300);
    } else if (await predict.isVisible()) {
      const { min, max, answer } = bank.predict;
      await drag(page, 'duel-predict-slider', min, answer, min, max);
      await tap(page, 'duel-predict-submit', 1200);
    } else if (await chart.isVisible()) {
      const { min, max, answer } = bank.chart;
      await drag(page, 'duel-chart-slider', min, answer, min, max);
      await tap(page, 'duel-chart-submit', 1500);
    } else if (await sort.isVisible()) {
      const ids = await page
        .locator('[data-testid^="duel-sort-item-"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('duel-sort-item-', '')));
      for (const i of ids) {
        const text = normalise(await page.getByTestId(`duel-sort-item-${i}`).innerText());
        let bucket = [...bank.sort.entries()].find(([t]) => text.includes(t))?.[1] ?? 0;
        if (/starter fund/i.test(text)) bucket = 0; // Alex's mistake: a child's starter fund is long-term money
        await tap(page, bucket === 0 ? `duel-sort-left-${i}` : `duel-sort-right-${i}`, 600);
      }
      await tap(page, 'duel-sort-submit', 900);
    } else if (await match.isVisible()) {
      const rights = page.locator('[data-testid^="match-right-"]');
      const rightTexts = (await rights.allInnerTexts()).map(normalise);
      const rightIds = await rights.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!));
      const leftIds = await page.locator('[data-testid^="match-left-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!));
      for (const leftId of leftIds) {
        const term = normalise(await page.getByTestId(leftId).innerText());
        const definition = [...bank.match.entries()].find(([t]) => term.includes(t))?.[1];
        const j = definition ? rightTexts.findIndex((r) => r.includes(definition)) : -1;
        if (j < 0) console.warn(`No match for term: ${term}`);
        await tap(page, leftId, 500);
        await tap(page, rightIds[Math.max(j, 0)], 500);
      }
      await tap(page, 'duel-match-submit', 900);
    }

    // The app shows the feedback and moves on by itself after 3 s (FEEDBACK_AUTO_ADVANCE_MS in useDuelMatch.ts).
    const feedback = page.getByTestId('duel-feedback');
    await expect(feedback).toBeVisible({ timeout: 20_000 });
    await expect(feedback).toBeHidden({ timeout: 20_000 });
  }
}

test.beforeAll(async ({ request }) => {
  await resetOnboarding(request);
  // Clears completed lessons (and restores the demo streak), so berlin-1 ends with new XP, not "Already completed".
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const reset = await request.post(`/api/users/demo-user/progress/reset?today=${today}`);
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

  // 1. The everyday bank, then Learn.
  await page.goto('/');
  await expect(page.getByTestId('screen-overview')).toBeVisible({ timeout: 120_000 });
  // The bank renders at 412 CSS px; a wider value means the 3× rendering broke the mobile layout.
  expect(await page.evaluate(() => window.innerWidth)).toBe(412);
  await rec.start('01-bank-to-learn');
  await beat(page, 2500);
  await tap(page, 'nav-learn', 800);
  await beat(page, 600);

  // 2. Onboarding: welcome, the map and duel slides, three profile questions.
  await rec.start('02-onboarding');
  await expect(page.getByTestId('onboarding-welcome')).toBeVisible();
  await beat(page, 1800);
  await tap(page, 'onboarding-start');
  await beat(page, 2000);
  await tap(page, 'onboarding-next');
  // The duel slide (Atlas intro): learn, then challenge your ideas with others.
  await expect(page.getByTestId('onboarding-challenge')).toBeVisible();
  await beat(page, 2000);
  await tap(page, 'onboarding-challenge-next');
  await tap(page, 'onboarding-personalise', 1200);

  await tap(page, 'option-building', 1000);
  await tap(page, 'onboarding-continue');
  for (const goal of ['start-saving', 'inflation', 'stocks-etfs']) await tap(page, `goal-${goal}`, 400);
  await tap(page, 'onboarding-continue', 800);
  await tap(page, 'option-investing', 1000);
  await tap(page, 'onboarding-continue');
  await beat(page, 600);

  // 3. Consent to the bank data, what Jev already knows, the Quick check.
  await rec.start('03-consent-quick-check');
  await expect(page.getByTestId('categorizing-consent')).toBeVisible({ timeout: 20_000 });
  await beat(page, 2000);
  await tap(page, 'consent-accept');
  await expect(page.getByTestId('categorizing-know')).toBeVisible({ timeout: 20_000 });
  await beat(page, 3000);
  await tap(page, 'know-start');

  // Time frame: the flat in 2–3 years → "1–5 years". No confidence chip on profile questions.
  await beat(page, 1500);
  await tap(page, 'quick-check-option-1');
  if (!REAL_JEV) {
    // Real interest: Alex gets it wrong and says he is guessing.
    await beat(page, 2500);
    await tap(page, 'quick-check-option-0');
    await tap(page, 'confidence-guessing', 900);
    // Emergency fund: right, fairly sure.
    await beat(page, 2500);
    await tap(page, 'quick-check-option-0');
    await tap(page, 'confidence-fairly-sure', 900);
    // Time in the market: right, but guessing.
    await beat(page, 2500);
    await tap(page, 'quick-check-option-2');
    await tap(page, 'confidence-guessing', 900);
  } else {
    // Jev picks the questions, so answer whatever comes until the summary shows.
    const summary = page.getByTestId('learning-path');
    while (!(await summary.isVisible())) {
      const option = page.getByTestId('quick-check-option-0');
      if (await option.isVisible()) {
        await beat(page, 2000);
        await act(page);
        await option.click();
        const chip = page.getByTestId('confidence-guessing');
        if (await chip.isVisible({ timeout: 1500 }).catch(() => false)) await tap(page, 'confidence-guessing', 700);
      }
      await page.waitForTimeout(300);
    }
  }

  // 4. "How we see you" and the first lesson.
  await rec.start('04-summary');
  await expect(page.getByTestId('learning-path')).toBeVisible({ timeout: 20_000 });
  await beat(page, 4000);
  await page.getByTestId('summary-first-lesson').scrollIntoViewIfNeeded();
  await beat(page, 2500);
  await tap(page, 'summary-start');
  await beat(page, 600);

  // 5. The globe: pick Berlin, open its lessons, start the first one.
  await rec.start('05-globe');
  await expect(page.getByTestId('screen-learn')).toBeVisible({ timeout: 15_000 });
  await beat(page, 3000);
  await tap(page, 'story-card-berlin', 800);
  await beat(page, 2500); // the globe flies to Berlin
  await tap(page, 'pin-callout-open', 1200);
  await expect(page.getByTestId('screen-story')).toBeVisible();
  await beat(page, 2000);
  await tap(page, 'lesson-berlin-1', 1500);
  await beat(page, 600);

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
