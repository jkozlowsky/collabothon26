import type { LessonSummary } from '@/types/lessons';
import type { Learner, Story } from '@/types/stories';

// ponytail: local mock, replaced by `GET /api/stories` (f4-f5-lessons-spec.md §6) once the backend has it.
// One path per learning area (FocusArea): Saving (Berlin), Investing (Tokyo), Borrowing (São Paulo), Risk (Seoul),
// Retirement (Cape Town, coming soon). Buenos Aires, Nairobi and Mumbai add a first extra lesson to their area.
// Cities are spread out so pins never overlap (globe-home-spec.md §9).
export const STORIES: Story[] = [
  {
    id: 'berlin',
    city: 'Berlin',
    title: 'Saving',
    topic: 'A safety net that keeps its value',
    status: 'available',
    pin: { lat: 52.52, lng: 13.4 },
    icon: 'shield',
    color: 'teal',
    progress: { done: 0, total: 5 },
    nextLesson: { id: 'berlin-1', title: 'Pay yourself first', minutes: 3 },
    current: true,
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    title: 'Investing',
    topic: 'Make money work for years',
    status: 'available',
    pin: { lat: 35.68, lng: 139.69 },
    icon: 'trending-up',
    color: 'rose',
    progress: { done: 0, total: 5 },
    nextLesson: { id: 'tokyo-1', title: 'Lend it or own it', minutes: 4 },
    current: false,
  },
  {
    id: 'sao-paulo',
    city: 'São Paulo',
    title: 'Borrowing',
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
    id: 'seoul',
    city: 'Seoul',
    title: 'Risk',
    topic: 'Hype, scams and borrowed money',
    status: 'available',
    pin: { lat: 37.57, lng: 126.98 },
    icon: 'message-circle',
    color: 'violet',
    progress: { done: 0, total: 5 },
    nextLesson: { id: 'seoul-1', title: 'The chat that always knows', minutes: 4 },
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
  {
    id: 'cape-town',
    city: 'Cape Town',
    title: 'Retirement',
    topic: 'Money for the years after work',
    status: 'coming-soon',
    pin: { lat: -33.92, lng: 18.42 },
    icon: 'sunset',
    color: 'slate',
    progress: { done: 0, total: 0 },
    nextLesson: null,
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
