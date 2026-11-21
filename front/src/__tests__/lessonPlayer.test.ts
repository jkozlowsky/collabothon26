import { answer, isFinished, isRetry, next, orderOf, resultRequest, startProgress, switchMode, type LessonProgress } from '@/lib/lessonPlayer';
import type { Lesson, Scene, Step } from '@/types/lessons';

// seoul-1's shape: classic c1 t1 p1 s1 t2 q1 q2; video v1 p1 v2 s1 v3 q1 q2 v4.
const quiz = (id: string): Step => ({ type: 'quiz', id, prompt: id, options: ['a', 'b'], correctIndex: 0, explanation: '' });
const scene = (id: string) => ({ type: 'scene', id }) as Scene;
const lesson = {
  id: 'seoul-1',
  concepts: [],
  startMode: 'video',
  steps: [
    { type: 'chat', id: 'c1', messages: [] },
    { type: 'text', id: 't1', body: '' },
    { type: 'predict', id: 'p1' } as unknown as Step,
    { type: 'slider-chart', id: 's1' } as unknown as Step,
    { type: 'text', id: 't2', body: '' },
    quiz('q1'),
    quiz('q2'),
  ],
  video: { minutes: 5, scenes: ['v1', 'v2', 'v3', 'v4'].map(scene), beats: ['v1', 'p1', 'v2', 's1', 'v3', 'q1', 'q2', 'v4'] },
} as unknown as Lesson;

const play = (p: LessonProgress, ...ids: (string | [string, boolean])[]) =>
  ids.reduce((acc, item) => {
    const [id, correct] = Array.isArray(item) ? item : [item, undefined];
    expect(acc.current).toBe(id);
    return answer(acc, lesson, id, correct === undefined ? {} : { correct });
  }, p);

test('plays each mode in its own order, then finishes', () => {
  expect(orderOf(lesson, 'classic')).toEqual(['c1', 't1', 'p1', 's1', 't2', 'q1', 'q2']);
  const video = startProgress(lesson);
  expect(video.mode).toBe('video');
  const done = play(video, 'v1', 'p1', 'v2', 's1', 'v3', ['q1', true], ['q2', true], 'v4');
  expect(isFinished(done)).toBe(true);
  expect(resultRequest(done)).toEqual({
    steps: [
      { stepId: 'q1', correctFirstTry: true },
      { stepId: 'q2', correctFirstTry: true },
    ],
    scenarioChoices: {},
    mode: 'video',
  });
  // A lesson without a video track always opens in classic.
  expect(startProgress({ ...lesson, video: null }).mode).toBe('classic');
});

test('video → classic mid-lesson starts at the next undone shared step and skips chat/text', () => {
  const p = play(startProgress(lesson, 'video'), 'v1', 'p1', 'v2');
  const classic = switchMode(p, lesson, 'classic');
  expect(classic.current).toBe('s1');
  expect(classic.done.has('c1') && classic.done.has('t1')).toBe(true);
  // t2 comes after s1 in classic, so it still plays.
  expect(play(classic, 's1').current).toBe('t2');
});

test('classic → video starts at the scene right before the next step', () => {
  const p = play(startProgress(lesson, 'classic'), 'c1', 't1', 'p1');
  const video = switchMode(p, lesson, 'video');
  expect(video.current).toBe('v2');
  expect(video.done.has('v1')).toBe(true);
  expect(play(video, 'v2').current).toBe('s1');
});

test('with every shared step done, the trailing scenes or steps play, then the repeats', () => {
  const classic = play(startProgress(lesson, 'classic'), 'c1', 't1', 'p1', 's1', 't2', ['q1', false], ['q2', true]);
  expect(classic.current).toBe('q1');
  const video = switchMode(classic, lesson, 'video');
  // The ending scene first, then the repeat.
  expect(video.current).toBe('v4');
  expect(play(video, 'v4').current).toBe('q1');

  const viaVideo = play(startProgress(lesson, 'video'), 'v1', 'p1', 'v2', 's1', 'v3', ['q1', true], ['q2', true]);
  const back = switchMode(viaVideo, lesson, 'classic');
  expect(isFinished(back)).toBe(true);
});

test('a quiz answered wrong in video comes back at the end of classic, as a retry', () => {
  const p = play(startProgress(lesson, 'video'), 'v1', 'p1', 'v2', 's1', 'v3', ['q1', false]);
  const classic = switchMode(p, lesson, 'classic');
  expect(classic.current).toBe('q2');
  const after = play(classic, ['q2', true]);
  expect(after.current).toBe('q1');
  expect(isRetry(after)).toBe(true);
  // Right on the second try: done, and only the first try counts.
  const end = play(after, ['q1', true]);
  expect(isFinished(end)).toBe(true);
  expect(end.firstTry).toEqual({ q1: false, q2: true });
  expect(resultRequest(end).mode).toBe('classic');
});

test('a step on screen without an answer shows again after a switch', () => {
  const p = play(startProgress(lesson, 'video'), 'v1');
  expect(p.current).toBe('p1');
  expect(switchMode(p, lesson, 'classic').current).toBe('p1');
  const c = play(startProgress(lesson, 'classic'), 'c1', 't1', 'p1');
  expect(c.current).toBe('s1');
  // The scene before s1 plays first, then s1 itself (still unanswered).
  expect(next(switchMode(c, lesson, 'video'), orderOf(lesson, 'video'))).toBe('v2');
  // Switching to the same mode, or to video without a track, changes nothing.
  expect(switchMode(c, lesson, 'classic')).toBe(c);
  expect(switchMode(c, { ...lesson, video: null }, 'video')).toBe(c);
});

test('Transcript in the middle of a scene shows the text that scene stands for', () => {
  // On v1 at the start: classic must show c1 and t1, not jump to p1.
  expect(switchMode(startProgress(lesson), lesson, 'classic').current).toBe('c1');
  const atV3 = play(startProgress(lesson), 'v1', 'p1', 'v2', 's1');
  // On v3, which stands for t2: classic shows t2.
  expect(switchMode(atV3, lesson, 'classic').current).toBe('t2');
});
