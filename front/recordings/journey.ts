/// <reference types="node" />
import { readFileSync } from 'fs';
import path from 'path';

import { expect, type Locator, type Page } from '@playwright/test';

import { categorization } from '../src/test-utils/categorization';
import { POOL } from '../src/test-utils/checkPool';
import { findQuestion, loadDuelQuestions, normalise, type DuelQuestion } from './duelAnswers';

/**
 * Steps of the demo recording (berlin-first-step.rec.ts): taps and scrolls a viewer can follow, the stubbed Jev,
 * the berlin-1 lesson and the duel.
 */

/**
 * Multiplies every pause. The default keeps all clips together under 5 minutes; PACE=0.3 for a quick dry run,
 * PACE=1 for a slower take. Scrolling keeps its own slow speed whatever the PACE.
 */
export const PACE = Number(process.env.PACE ?? 0.5);
/** The clip size: the Pixel 7 viewport (412×839) at the 3× the config renders at. */
export const CLIP_SIZE = { width: 1236, height: 2516 };

/** The lesson Alex plays, read from the backend content: the right quiz options and the bucket of each statement. */
const LESSON = (() => {
  const raw = JSON.parse(readFileSync(path.resolve('../back/src/main/resources/content/lessons/berlin-1.json'), 'utf8')) as {
    steps: { type: string; options?: string[]; correctIndex?: number; items?: { text: string; bucket: 0 | 1 }[] }[];
  };
  const correct = new Set(raw.steps.filter((st) => st.type === 'quiz').map((st) => normalise(st.options![st.correctIndex!])));
  const bucket = new Map(raw.steps.flatMap((st) => st.items ?? []).map((it) => [normalise(it.text), it.bucket] as const));
  return { correct, bucket };
})();

const CATEGORIZATION_URL = '**/api/users/demo-user/categorization';
/** The stubbed Quick check asks these one by one; three answers are enough to place Alex. */
export const ORDER = ['berlin-1/q2', 'berlin-2/q1', 'seoul-1/q2'];
const MASTERY = { saving: 0.55, investing: 0.25 };
export const correctOption = (id: string) => POOL.find((q) => q.id === id)!.correctIndex;
const START = { lessonId: 'berlin-1', title: 'Safe money that shrinks', area: 'saving' as const, storyId: 'berlin', storyCity: 'Berlin' };

/** What the stubbed Jev "concludes" about Alex: saves regularly, invests timidly, mixes up real interest. */
const ALEX = categorization({
  role: 'novice',
  focusAreas: ['saving', 'investing'],
  gaps: [
    {
      area: 'investing',
      direction: 'habit-ahead',
      because: 'Your account shows you already invest. Your Investing answers leave a few things open to explore.',
    },
  ],
  explanation: [
    { output: 'role', probabilities: {}, because: ['You save regularly and keep a solid safety net.', 'Real interest is still new to you.'] },
    { output: 'focusAreas', probabilities: {}, because: ['Your goal is a home in 2–3 years.', 'You picked saving and ETFs as goals.'] },
  ],
  profile: { ageBand: null, savingsCover: null, horizon: '1-5y' },
  mastery: MASTERY,
  answerCount: 3,
  startLesson: START,
  startHere: START,
  pathStoryIds: ['berlin'],
});

/** A pause the viewer needs to read the screen. */
export const beat = (page: Page, ms = 1200) => page.waitForTimeout(ms * PACE);

/** Every tap, drag and click waits one more second, so the audience can read the screen during the pitch. */
const ACTION_DELAY = 1000;
export const act = (page: Page) => beat(page, ACTION_DELAY);

/** A new screen stays still this long before anything scrolls. */
const SETTLE_MS = 1000;
/** Scrolling speed in CSS pixels per second: slow enough to read along. */
const SCROLL_PX_PER_S = 220;
const MIN_SCROLL_MS = 600;

/**
 * Scrolls the nearest scrolling ancestor of `target` slowly (eased), after a short look at the screen.
 * `center` brings the target to the middle of the view, `end` scrolls that container to its bottom.
 */
export async function glide(page: Page, target: Locator, align: 'center' | 'end' = 'center') {
  await page.waitForTimeout(SETTLE_MS);
  await target.evaluate(
    (el, { align, pxPerS, minMs }) =>
      new Promise<void>((resolve) => {
        const scrolls = (e: HTMLElement) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY);
        let box: HTMLElement | null = align === 'end' && scrolls(el as HTMLElement) ? (el as HTMLElement) : el.parentElement;
        while (box && !scrolls(box)) box = box.parentElement;
        const scroller = box ?? (document.scrollingElement as HTMLElement);
        const view = box ? box.getBoundingClientRect() : { top: 0, height: window.innerHeight };
        const max = scroller.scrollHeight - scroller.clientHeight;
        const from = scroller.scrollTop;
        const r = el.getBoundingClientRect();
        const wanted = align === 'end' ? max : from + r.top + r.height / 2 - (view.top + view.height / 2);
        const to = Math.max(0, Math.min(max, wanted));
        if (Math.abs(to - from) < 2) return resolve();
        const ms = Math.max(minMs, (Math.abs(to - from) / pxPerS) * 1000);
        const start = performance.now();
        const frame = (now: number) => {
          const t = Math.min(1, (now - start) / ms);
          const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          scroller.scrollTop = from + (to - from) * eased;
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      }),
    { align, pxPerS: SCROLL_PX_PER_S, minMs: MIN_SCROLL_MS },
  );
}

/** Whether the whole element is on screen. */
const onScreen = (target: Locator) =>
  target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
  });

/** Taps like a person: scrolls slowly to the target if it is off screen, a short look, then the tap. */
export async function tap(page: Page, testId: string, before = 500) {
  const target = page.getByTestId(testId).filter({ visible: true }).first();
  await expect(target).toBeVisible({ timeout: 20_000 });
  if (!(await onScreen(target))) await glide(page, target);
  await beat(page, before);
  await act(page);
  await target.click();
}

/**
 * The video has no cursor, so every tap draws a fading ring where the finger landed.
 * Also hides two overlays that only exist in `expo start`: the LogBox toast (#error-toast) and the ⚡ Fast Refresh
 * indicator (.__expo_fast_refresh), which shows while Metro bundles a route for the first time.
 */
export const TOUCH_RINGS = () => {
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

/** Stubs Jev the way e2e/quick-check.spec.ts does, so the take places Alex in Berlin every time. */
export async function stubJev(page: Page) {
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

/** Drags a slider (components/bank/Slider) from `from` to `to`, slowly enough to be seen. */
export async function drag(page: Page, testId: string, from: number, to: number, min: number, max: number) {
  const slider = page.getByTestId(testId).filter({ visible: true }).first();
  if (!(await onScreen(slider))) await glide(page, slider);
  const box = await slider.boundingBox();
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

/** The first video scene of berlin-1 lasts 13 s; the transcript opens halfway through it. Real time, not PACE. */
const HALF_FIRST_SCENE_MS = 6500;
/** The whole lesson at the slowest PACE fits well within this. */
const LESSON_TIMEOUT_MS = 8 * 60_000;

/**
 * Plays berlin-1 in video mode (content: back/src/main/resources/content/lessons/berlin-1.json). Halfway through
 * the first scene the transcript opens for a moment, then the video goes on. Steps are recognised by their testIDs and
 * quiz answers come from the lesson file, so the order of the beats can change. In Myth or fact, once every card is
 * sorted, `glossary` (a word underlined in the explanation) opens in the glossary for a second.
 * Returns whether the glossary word was opened.
 */
export async function playLesson(page: Page, { glossary }: { glossary: string }): Promise<boolean> {
  await expect(page.getByTestId('video-lesson')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('scene-caption')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(HALF_FIRST_SCENE_MS);
  await tap(page, 'lesson-transcript', 0);
  await expect(page.getByTestId('lesson-watch')).toBeVisible();
  await beat(page, 4000); // the same scene as text
  await tap(page, 'lesson-watch', 600);
  await expect(page.getByTestId('video-lesson')).toBeVisible();

  const end = page.getByTestId('lesson-end');
  const step = (id: string) => visible(page, id);
  let sorted = false;
  let glossaryOpened = false;
  const next = async (before: number) => {
    await expect(step('continue')).toBeEnabled({ timeout: 20_000 });
    await beat(page, before);
    await act(page);
    await step('continue').click();
  };

  const deadline = Date.now() + LESSON_TIMEOUT_MS;
  while (!(await end.isVisible())) {
    if (Date.now() > deadline) throw new Error('berlin-1 did not reach its end screen');
    if ((await step('slider-interest').isVisible()) && !(await step('goal-reached').isVisible())) {
      await beat(page, 3000);
      await drag(page, 'slider-interest', 0.5, 3, 0, 5); // up to the 3 % price rise
      await expect(page.getByTestId('goal-reached')).toBeVisible();
      await next(2500);
    } else if (await step('slider-inflation').isVisible()) {
      // The personal chart (his own savings rate from the bank): what if prices rose 4 % instead of 2 %.
      await beat(page, 3500);
      await drag(page, 'slider-inflation', 2, 4, 0, 8);
      await next(3000);
    } else if (await step('sort-left').isVisible()) {
      // Myth or fact: Alex reads each statement and sorts it right. The card's label starts with its statement.
      sorted = true;
      const card = page.getByTestId('sort-card');
      const label = normalise((await card.getAttribute('aria-label')) ?? '');
      const bucket = [...LESSON.bucket.entries()].find(([text]) => label.startsWith(text))?.[1];
      expect(bucket, `the bucket of "${label}"`).toBeDefined();
      await beat(page, 2200);
      await tap(page, bucket === 1 ? 'sort-right' : 'sort-left', 300);
      // The card flies out before the next one replaces it; read the next one only once it is there.
      await expect
        .poll(async () => ((await card.count()) ? normalise((await card.getAttribute('aria-label')) ?? '') : null))
        .not.toBe(label);
    } else if (sorted && !glossaryOpened && (await step('feedback').isVisible())) {
      // Myth or fact done: the explanation underlines a glossary word. Open it, a second to read, close it.
      glossaryOpened = true;
      await tap(page, `concept-${glossary}`, 1500);
      await expect(page.getByTestId('sheet-close')).toBeVisible();
      await beat(page, 1000);
      await tap(page, 'sheet-close', 300);
      await expect(page.getByTestId('sheet-close')).toBeHidden();
      await next(1500);
    } else if (await step('choice-0').isVisible()) {
      // The decision: the money is for a flat in 3 years, so Alex tries the fixed-term deposit.
      await beat(page, 4000);
      await tap(page, 'choice-2', 600);
      await expect(page.getByTestId('scenario-ending')).toBeVisible();
      await next(5000);
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
  return glossaryOpened;
}

/** The duel's stories: Berlin, finished by then, and Seoul, where only the first lesson is open. */
export const DUEL_STORIES = ['berlin', 'seoul'];

/**
 * Plays a duel's questions, whatever their order (content: back/src/main/resources/content/duel/). Alex gets
 * everything right except two on purpose, so the review shows both kinds of link: the first Berlin question (its
 * lesson is done, so it opens) and the first Seoul question past seoul-1 (its lesson is still locked). A match draws
 * 3 questions per story and Seoul has only 2 on seoul-1, so that question always comes up.
 */
export async function playDuel(page: Page): Promise<{ open: number; locked: number }> {
  const questions = loadDuelQuestions(DUEL_STORIES);
  /** The 0-based numbers of the questions missed on purpose; -1 until it happens. */
  const missed = { open: -1, locked: -1 };
  const question = page.getByTestId('duel-question');
  const feedback = page.getByTestId('duel-feedback');
  const result = page.getByTestId('duel-result');

  for (let n = 0; !(await result.isVisible()); n++) {
    await expect(question.or(result).first()).toBeVisible({ timeout: 120_000 });
    if (await result.isVisible()) break;
    const kinds = ['duel-quiz', 'duel-predict', 'duel-chart', 'duel-sort'].map((id) => page.getByTestId(id));
    await expect(kinds.reduce((a, b) => a.or(b)).first()).toBeVisible({ timeout: 20_000 });
    const q = findQuestion(questions, await question.innerText());
    await beat(page, 2500); // reading the question

    const missOpen = q.story === 'berlin' && missed.open < 0;
    const missLocked = q.story === 'seoul' && q.lessonId !== 'seoul-1' && missed.locked < 0;
    if (missOpen) missed.open = n;
    if (missLocked) missed.locked = n;
    await answer(page, q, missOpen || missLocked);

    // The app shows the feedback and moves on by itself after 3 s (FEEDBACK_AUTO_ADVANCE_MS in useDuelMatch.ts).
    await expect(feedback).toBeVisible({ timeout: 20_000 });
    await expect(feedback).toBeHidden({ timeout: 20_000 });
  }
  expect(Math.min(missed.open, missed.locked), 'the duel had no question for one of the planned mistakes').toBeGreaterThanOrEqual(0);
  return missed;
}

async function answer(page: Page, { step }: DuelQuestion, miss: boolean) {
  if (step.type === 'quiz') {
    const texts = (await page.locator('[data-testid^="duel-option-"]').allInnerTexts()).map(normalise);
    const right = texts.findIndex((t) => t.includes(normalise(step.options[step.correctIndex])));
    expect(right, `the right option of ${step.id}`).toBeGreaterThanOrEqual(0);
    await tap(page, `duel-option-${miss ? (right + 1) % texts.length : right}`, 300);
  } else if (step.type === 'predict' || step.type === 'chart') {
    const { min, max } = step.input;
    // The slider starts at min; for a miss it goes to the far end, nowhere near the tolerance.
    const far = step.answer - min > max - step.answer ? min : max;
    await drag(page, `duel-${step.type}-slider`, min, miss ? far : step.answer, min, max);
    await tap(page, `duel-${step.type}-submit`, 1200);
  } else {
    const { items } = step;
    const item = page.locator('[data-testid^="duel-sort-item-"]').filter({ visible: true }).first();
    let first = true;
    while (await item.isVisible()) {
      const index = (await item.getAttribute('data-testid'))!.replace('duel-sort-item-', '');
      const text = normalise(await item.innerText());
      const key = items.find((it) => text.includes(normalise(it.text)));
      expect(key, `the bucket of "${text}"`).toBeDefined();
      const bucket = miss && first ? 1 - key!.bucket : key!.bucket;
      first = false;
      await tap(page, bucket === 0 ? `duel-sort-left-${index}` : `duel-sort-right-${index}`, 600);
      await expect(page.getByTestId(`duel-sort-item-${index}`)).toBeHidden();
    }
    await tap(page, 'duel-sort-submit', 900);
  }
}

/** Today as YYYY-MM-DD in local time, as the app sends it. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Waits until the Learn screen's globe has drawn its first frame (Globe.tsx shows `globe-ready`). */
export async function waitForGlobe(page: Page) {
  await expect(page.getByTestId('screen-learn')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('globe-ready')).toBeAttached({ timeout: 60_000 });
  await page.waitForTimeout(500); // the first frame is on screen, give the pins a moment to settle
}
