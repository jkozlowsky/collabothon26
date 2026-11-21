import { pickHomeStory, TEASER_STORY, teaserFor } from '@/lib/bank/teasers';
import { STORIES } from '@/lib/stories';
import type { Story } from '@/types/stories';

const story = (id: string, patch: Partial<Story> = {}) => ({ ...STORIES.find((s) => s.id === id)!, ...patch });

test('every bank tab points at a story that exists', () => {
  for (const id of Object.values(TEASER_STORY)) expect(STORIES.some((s) => s.id === id)).toBe(true);
});

test('a story not started yet offers its first lesson', () => {
  expect(teaserFor(story('tokyo'))).toEqual({
    storyId: 'tokyo',
    lessonId: 'tokyo-1',
    title: 'Start: Lend it or own it',
    meta: 'Lesson 1 of 5 · 4 min',
    progress: 0,
  });
});

test('a story in progress continues at its next lesson', () => {
  const t = teaserFor(story('sao-paulo', { progress: { done: 2, total: 5 }, nextLesson: { id: 'sao-paulo-3', title: 'Third', minutes: 3 } }));
  expect(t).toMatchObject({ lessonId: 'sao-paulo-3', title: 'Continue: Third', meta: 'Lesson 3 of 5 · 3 min', progress: 0.4 });
});

test('a finished story offers a review and no lesson', () => {
  const t = teaserFor(story('berlin', { progress: { done: 5, total: 5 }, nextLesson: null }));
  expect(t).toMatchObject({ storyId: 'berlin', title: 'Review: A safety net that keeps its value', progress: 1 });
  expect(t.lessonId).toBeUndefined();
});

test('home prefers a story in progress over the current one', () => {
  const stories = STORIES.map((s) => (s.id === 'tokyo' ? { ...s, progress: { done: 1, total: 5 } } : s));
  expect(pickHomeStory(stories).id).toBe('tokyo');
  // Nothing started: the default story, Saving in Berlin.
  expect(pickHomeStory(STORIES).id).toBe('berlin');
});
