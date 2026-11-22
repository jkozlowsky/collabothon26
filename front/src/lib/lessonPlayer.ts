/**
 * Lesson flow over step ids, for both modes (.plans/lesson-video-mode-spec.md §5). Classic plays `lesson.steps`,
 * video plays `lesson.video.beats` (scenes and the same steps). One progress state serves both, so the user can
 * switch mode at any moment. Duolingo style: a graded step answered wrong comes again at the end until it is
 * right; only the first try counts for the result. In memory only: leaving a lesson starts it over.
 */
import type { Lesson, LessonMode, LessonResultRequest, Step, StepOutcome, StepType } from '@/types/lessons';

const GRADED: ReadonlySet<StepType> = new Set(['quiz', 'match', 'sort']);

export type LessonProgress = {
  mode: LessonMode;
  /** Steps left with Continue, and scenes that ended or were skipped. */
  done: Set<string>;
  /** Graded steps, first answer only. */
  firstTry: Record<string, boolean>;
  /** Scenario choices. */
  choices: Record<string, number>;
  /** Graded steps answered wrong, still to redo, in order. */
  repeats: string[];
  /** Id of the step or scene on screen; null once the lesson is finished. */
  current: string | null;
  /** Counts answers, so a step shown again mounts fresh (reset, reshuffled). */
  turn: number;
};

/** The play order of a mode: step ids (classic) or beats (video). */
export function orderOf(lesson: Lesson, mode: LessonMode): string[] {
  return mode === 'video' && lesson.video ? lesson.video.beats : lesson.steps.map((s) => s.id);
}

/** First id in the order that isn't done, then the first repeat, then null (finished). */
export function next(progress: Pick<LessonProgress, 'done' | 'repeats'>, order: string[]): string | null {
  return order.find((id) => !progress.done.has(id)) ?? progress.repeats[0] ?? null;
}

export function startProgress(lesson: Lesson, mode: LessonMode = lesson.startMode): LessonProgress {
  const playable: LessonMode = mode === 'video' && lesson.video ? 'video' : 'classic';
  const base = { mode: playable, done: new Set<string>(), firstTry: {}, choices: {}, repeats: [], turn: 0 };
  return { ...base, current: next(base, orderOf(lesson, playable)) };
}

const stepById = (lesson: Lesson, id: string): Step | undefined => lesson.steps.find((s) => s.id === id);

/** The user left a step with Continue, or a scene ended or was skipped. */
export function answer(progress: LessonProgress, lesson: Lesson, id: string, outcome: StepOutcome = {}): LessonProgress {
  const step = stepById(lesson, id);
  const graded = !!step && GRADED.has(step.type);
  const failed = graded && outcome.correct === false;
  const done = new Set(progress.done).add(id);
  const repeats = progress.repeats.filter((r) => r !== id);
  if (failed) repeats.push(id);
  const updated = {
    ...progress,
    done,
    repeats,
    firstTry: graded && !(id in progress.firstTry) ? { ...progress.firstTry, [id]: outcome.correct !== false } : progress.firstTry,
    choices: outcome.choice !== undefined ? { ...progress.choices, [id]: outcome.choice } : progress.choices,
    turn: progress.turn + 1,
  };
  return { ...updated, current: next(updated, orderOf(lesson, progress.mode)) };
}

/**
 * Switches mode, keeping the place (§5.2). The other mode starts at the first shared step not done:
 * video → classic skips the chat/text steps before it (the scenes covered them); classic → video starts
 * at the scene right before it, if there is one and it wasn't watched. With every shared step done, the
 * remaining scenes (video) or classic-only steps (classic) play, then the repeats.
 */
export function switchMode(progress: LessonProgress, lesson: Lesson, mode: LessonMode): LessonProgress {
  if (mode === progress.mode || (mode === 'video' && !lesson.video)) return progress;
  const target = orderOf(lesson, mode);
  const other = new Set(orderOf(lesson, progress.mode));
  const shared = (id: string) => other.has(id);

  const firstOpen = target.findIndex((id) => shared(id) && !progress.done.has(id));
  const lastShared = target.reduce((last, id, i) => (shared(id) ? i : last), -1);
  const cut = firstOpen >= 0 ? firstOpen : lastShared + 1;
  // In video, the scene right before the step stays, so the user sees motion right after switching.
  const keepScene = mode === 'video' && firstOpen > 0 && !shared(target[firstOpen - 1]) ? target[firstOpen - 1] : null;
  // In classic (the transcript), the text right before the step stays when the scenes that stand for it
  // weren't watched to the end: leaving a scene for its transcript must show that text, not skip it.
  const keepText = new Set<string>();
  if (mode === 'classic') {
    const from = orderOf(lesson, progress.mode);
    const nextShared = from.findIndex((id) => target.includes(id) && !progress.done.has(id));
    const scenesBefore = trailingRun(from, nextShared < 0 ? from.length : nextShared, (id) => !target.includes(id));
    if (scenesBefore.some((id) => !progress.done.has(id))) {
      trailingRun(target, cut, (id) => !shared(id)).forEach((id) => keepText.add(id));
    }
  }

  const done = new Set(progress.done);
  target.slice(0, cut).forEach((id) => {
    if (!shared(id) && id !== keepScene && !keepText.has(id)) done.add(id);
  });
  const updated = { ...progress, mode, done };
  return { ...updated, current: next(updated, target) };
}

/** The ids right before `end` in `order` that all pass `test`, in order. */
function trailingRun(order: string[], end: number, test: (id: string) => boolean): string[] {
  let start = end;
  while (start > 0 && test(order[start - 1])) start--;
  return order.slice(start, end);
}

export const isFinished = (progress: LessonProgress) => progress.current === null;

/** True when the step on screen was already answered once (a repeat after a mistake). */
export const isRetry = (progress: LessonProgress) => progress.current !== null && progress.done.has(progress.current);

/** 0–1 for the classic progress bar: done ids of the order over the order plus open repeats. */
export function progressShare(progress: LessonProgress, lesson: Lesson): number {
  const order = orderOf(lesson, progress.mode);
  const done = order.filter((id) => progress.done.has(id)).length;
  return progress.current === null ? 1 : done / (order.length + progress.repeats.length);
}

/** Concepts of graded steps missed on the first try. */
export function weakConcepts(progress: LessonProgress, steps: Step[], lessonConcepts: string[]): Set<string> {
  const weak = new Set<string>();
  for (const step of steps) {
    if (progress.firstTry[step.id] === false) (step.concepts ?? lessonConcepts).forEach((c) => weak.add(c));
  }
  return weak;
}

export function resultRequest(progress: LessonProgress): LessonResultRequest {
  return {
    steps: Object.entries(progress.firstTry).map(([stepId, correctFirstTry]) => ({ stepId, correctFirstTry })),
    scenarioChoices: progress.choices,
    mode: progress.mode,
  };
}

/** Fisher–Yates on a copy. Repeats shuffle tiles and cards so the answer isn't remembered by position. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
