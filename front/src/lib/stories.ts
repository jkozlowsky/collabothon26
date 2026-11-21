import type { LessonSummary } from '@/types/lessons';
import type { Learner, Story } from '@/types/stories';

// ponytail: local mock, replaced by `GET /api/stories` (f4-f5-lessons-spec.md §6) once the backend has it.
// Cities are spread out so pins never overlap (globe-home-spec.md §9); every city has content; Buenos Aires, Nairobi and Mumbai have one lesson so far.
export const STORIES: Story[] = [
  {
    id: 'seoul',
    city: 'Seoul',
    title: 'Investing',
    topic: 'Hype and borrowed money',
    status: 'available',
    pin: { lat: 37.57, lng: 126.98 },
    icon: 'message-circle',
    color: 'violet',
    progress: { done: 0, total: 5 },
    nextLesson: { id: 'seoul-1', title: 'The chat that always knows', minutes: 4 },
    current: true,
  },
  {
    id: 'berlin',
    city: 'Berlin',
    title: 'Saving',
    topic: 'Why safe savings lose value',
    status: 'available',
    pin: { lat: 52.52, lng: 13.4 },
    icon: 'shield',
    color: 'teal',
    progress: { done: 0, total: 5 },
    nextLesson: { id: 'berlin-1', title: 'Safe, but not free', minutes: 4 },
    current: false,
  },
  {
    id: 'sao-paulo',
    city: 'São Paulo',
    title: 'Credit & loans',
    topic: 'The real cost of instalments',
    status: 'available',
    pin: { lat: -23.55, lng: -46.63 },
    icon: 'credit-card',
    color: 'orange',
    progress: { done: 0, total: 5 },
    nextLesson: { id: 'sao-paulo-1', title: 'Twelve easy payments', minutes: 4 },
    current: false,
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    title: 'Investing',
    topic: 'Spreading your investments',
    status: 'available',
    pin: { lat: 35.68, lng: 139.69 },
    icon: 'globe',
    color: 'rose',
    progress: { done: 0, total: 5 },
    nextLesson: { id: 'tokyo-1', title: 'Buy what you know', minutes: 3 },
    current: false,
  },
  {
    id: 'buenos-aires',
    city: 'Buenos Aires',
    title: 'Money basics',
    topic: 'When prices run away',
    status: 'available',
    pin: { lat: -34.6, lng: -58.38 },
    icon: 'tag',
    color: 'orange',
    progress: { done: 0, total: 1 },
    nextLesson: { id: 'buenos-aires-1', title: 'How fast prices double', minutes: 4 },
    current: false,
  },
  {
    id: 'nairobi',
    city: 'Nairobi',
    title: 'Saving',
    topic: 'Saving on the go',
    status: 'available',
    pin: { lat: -1.29, lng: 36.82 },
    icon: 'smartphone',
    color: 'violet',
    progress: { done: 0, total: 1 },
    nextLesson: { id: 'nairobi-1', title: 'Small amounts add up', minutes: 4 },
    current: false,
  },
  {
    id: 'mumbai',
    city: 'Mumbai',
    title: 'Investing',
    topic: 'Why gold glitters',
    status: 'available',
    pin: { lat: 19.08, lng: 72.88 },
    icon: 'database',
    color: 'orange',
    progress: { done: 0, total: 1 },
    nextLesson: { id: 'mumbai-1', title: 'Why gold glitters', minutes: 4 },
    current: false,
  },
];

// ponytail: local mock, replaced by the learner profile API (topic C).
export const LEARNER: Learner = { name: 'Alex', streak: 5, xp: 120 };

/** Figma variant of a story's pin and card. */
export type StoryState = 'default' | 'active' | 'done' | 'comingSoon';
/** What the pin callout offers for a story. */
export type CalloutState = 'inProgress' | 'notStarted' | 'done' | 'comingSoon';

export function isDone(s: Story) {
  return s.status === 'available' && s.progress.total > 0 && s.progress.done >= s.progress.total;
}

export function storyState(s: Story): StoryState {
  if (s.status === 'coming-soon') return 'comingSoon';
  if (s.current) return 'active';
  return isDone(s) ? 'done' : 'default';
}

export function calloutState(s: Story): CalloutState {
  if (s.status === 'coming-soon') return 'comingSoon';
  if (isDone(s)) return 'done';
  return s.progress.done > 0 ? 'inProgress' : 'notStarted';
}

/** Sheet order: current, in progress, not started, done, coming soon. */
export function sortStories(stories: Story[]) {
  const rank = (s: Story) => (s.current ? 0 : ({ inProgress: 1, notStarted: 2, done: 3, comingSoon: 4 } as const)[calloutState(s)]);
  return [...stories].sort((a, b) => rank(a) - rank(b));
}

/** Screen-reader label: "{city}, {topic}, {state}". */
export function storyLabel(s: Story) {
  const state = { inProgress: 'in progress', notStarted: 'not started', done: 'done', comingSoon: 'coming soon' }[calloutState(s)];
  return `${s.city}, ${s.topic}, ${state}`;
}

/** Progress and next lesson from the backend's lesson list, for stories that have lessons there. */
export function withLessons(stories: Story[], lessons: LessonSummary[] | undefined): Story[] {
  if (!lessons) return stories;
  return stories.map((s) => {
    const own = lessons.filter((l) => l.story === s.id);
    if (own.length === 0) return s;
    const next = own.find((l) => l.status !== 'done');
    return {
      ...s,
      progress: { done: own.filter((l) => l.status === 'done').length, total: own.length },
      nextLesson: next ? { id: next.id, title: next.title, minutes: next.minutes } : null,
    };
  });
}

/**
 * Marks one story as current: the Quick check's "Start here" story, else the default story while it is not done,
 * else the first story in progress, else the first not started. None when every story is done.
 */
export function withCurrent(stories: Story[], startId?: string): Story[] {
  const pick =
    startId ??
    (
      stories.find((s) => s.current && !isDone(s) && s.status === 'available') ??
      stories.find((s) => calloutState(s) === 'inProgress') ??
      stories.find((s) => calloutState(s) === 'notStarted')
    )?.id;
  return stories.map((s) => ({ ...s, current: s.id === pick }));
}
