/**
 * Lesson flow, Duolingo style: steps play in order; a graded step answered wrong goes to the back of the
 * queue and comes again until it is right. Only the first try counts for the result. In memory only:
 * leaving a lesson starts it over.
 */
import type { Lang, LessonResultRequest, Step, StepOutcome, StepType } from '@/types/lessons';

export const GRADED: ReadonlySet<StepType> = new Set(['quiz', 'match', 'sort']);

export type PlayerState = {
  /** Step indices to play, repeats appended at the end. */
  queue: number[];
  pos: number;
  firstTry: Record<string, boolean>;
  choices: Record<string, number>;
};

export function startPlayer(steps: Step[]): PlayerState {
  return { queue: steps.map((_, i) => i), pos: 0, firstTry: {}, choices: {} };
}

export function advance(state: PlayerState, steps: Step[], outcome: StepOutcome): PlayerState {
  const index = state.queue[state.pos];
  const step = steps[index];
  const graded = GRADED.has(step.type);
  const failed = graded && outcome.correct === false;
  return {
    queue: failed ? [...state.queue, index] : state.queue,
    pos: state.pos + 1,
    firstTry: graded && !(step.id in state.firstTry) ? { ...state.firstTry, [step.id]: outcome.correct !== false } : state.firstTry,
    choices: outcome.choice !== undefined ? { ...state.choices, [step.id]: outcome.choice } : state.choices,
  };
}

export const isFinished = (state: PlayerState) => state.pos >= state.queue.length;

/** True when the current step was already shown once (a repeat after a mistake). */
export const isRetry = (state: PlayerState) => state.queue.indexOf(state.queue[state.pos]) < state.pos;

/** Concepts of graded steps missed on the first try. */
export function weakConcepts(state: PlayerState, steps: Step[], lessonConcepts: string[]): Set<string> {
  const weak = new Set<string>();
  for (const step of steps) {
    if (state.firstTry[step.id] === false) (step.concepts ?? lessonConcepts).forEach((c) => weak.add(c));
  }
  return weak;
}

export function resultRequest(state: PlayerState, lang: Lang): LessonResultRequest {
  return {
    steps: Object.entries(state.firstTry).map(([stepId, correctFirstTry]) => ({ stepId, correctFirstTry })),
    scenarioChoices: state.choices,
    lang,
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
