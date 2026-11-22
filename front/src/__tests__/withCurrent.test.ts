import { STORIES, withCurrent } from '@/lib/stories';
import type { Story } from '@/types/stories';

const progress = (done: Record<string, number>): Story[] =>
  STORIES.map((s) => (s.id in done ? { ...s, progress: { ...s.progress, done: done[s.id] } } : s));
const currentIds = (stories: Story[]) => stories.filter((s) => s.current).map((s) => s.id);

test('the default story stays current while it is not done', () => {
  expect(currentIds(withCurrent(progress({ berlin: 2 })))).toEqual(['berlin']);
});

test('a done default story hands the highlight to the story in progress', () => {
  expect(currentIds(withCurrent(progress({ berlin: 5, tokyo: 1 })))).toEqual(['tokyo']);
});

test('with nothing in progress, the first story not started is current', () => {
  const stories = withCurrent(progress({ seoul: 5, berlin: 5 }));
  expect(currentIds(stories)).toHaveLength(1);
  expect(['seoul', 'berlin']).not.toContain(currentIds(stories)[0]);
});

test('the Start here story wins', () => {
  expect(currentIds(withCurrent(progress({}), 'tokyo'))).toEqual(['tokyo']);
});
