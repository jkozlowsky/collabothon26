import { useCallback, useRef, useState } from 'react';

import { answer, isFinished, resultRequest, startProgress, switchMode, type LessonProgress } from '@/lib/lessonPlayer';
import type { Lesson, LessonMode, LessonResultRequest, LessonResultResponse, StepOutcome } from '@/types/lessons';

type Options = {
  saveResult: (result: LessonResultRequest) => Promise<LessonResultResponse>;
  /** Called on every switch, so the next lesson opens in the same mode. */
  rememberMode: (mode: LessonMode) => void;
};

export type LessonSession = {
  progress: LessonProgress;
  /** XP from the backend once finished; null while saving, 'error' if saving failed. */
  xp: number | null | 'error';
  /** The step on screen was left with Continue, or the scene on screen ended or was skipped. */
  complete: (id: string, outcome?: StepOutcome) => void;
  switchTo: (mode: LessonMode) => void;
};

/** One lesson run, in either mode: the progress state over step ids, the result save at the end. */
export function useLessonSession(lesson: Lesson, { saveResult, rememberMode }: Options): LessonSession {
  const [progress, setProgress] = useState(() => startProgress(lesson));
  const [xp, setXp] = useState<number | null | 'error'>(null);
  // The latest progress for the callbacks; only they change it, so it is set where the state is set.
  const ref = useRef(progress);

  const complete = useCallback(
    (id: string, outcome?: StepOutcome) => {
      const current = ref.current;
      // A scene that ends after the user already moved on (replay, skip race) changes nothing.
      if (current.current !== id) return;
      const updated = answer(current, lesson, id, outcome);
      ref.current = updated;
      setProgress(updated);
      if (isFinished(updated)) {
        saveResult(resultRequest(updated)).then(
          (r) => setXp(r.xpAwarded),
          () => setXp('error'),
        );
      }
    },
    [lesson, saveResult],
  );

  const switchTo = useCallback(
    (mode: LessonMode) => {
      const updated = switchMode(ref.current, lesson, mode);
      if (updated === ref.current) return;
      ref.current = updated;
      setProgress(updated);
      rememberMode(updated.mode);
    },
    [lesson, rememberMode],
  );

  return { progress, xp, complete, switchTo };
}
