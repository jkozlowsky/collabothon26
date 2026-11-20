import type { Learner, Story } from '@/types/stories';

// ponytail: local mock, replaced by `GET /api/stories` (f4-f5-lessons-spec.md §6) once the backend has it.
// Cities are spread out so pins never overlap (globe-home-spec.md §9); only Seoul and Berlin have content.
export const STORIES: Story[] = [
  {
    id: 'seoul',
    city: 'Seoul',
    title: 'The chat that always knows',
    topic: 'Hype & borrowed money',
    status: 'available',
    pin: { lat: 37.57, lng: 126.98 },
    icon: 'message-circle',
    color: 'rose',
    progress: { done: 1, total: 3 },
    nextLesson: { id: 8, title: 'Borrowed money', minutes: 4 },
    current: true,
  },
  {
    id: 'berlin',
    city: 'Berlin',
    title: 'Safe, but not free',
    topic: 'Cash & inflation',
    status: 'available',
    pin: { lat: 52.52, lng: 13.4 },
    icon: 'shield',
    color: 'teal',
    progress: { done: 0, total: 3 },
    nextLesson: { id: 10, title: 'What waiting costs', minutes: 4 },
    current: false,
  },
  {
    id: 'buenos-aires',
    city: 'Buenos Aires',
    title: 'When prices run away',
    topic: 'Inflation',
    status: 'coming-soon',
    pin: { lat: -34.6, lng: -58.38 },
    icon: 'tag',
    color: 'orange',
    progress: { done: 0, total: 0 },
    nextLesson: null,
    current: false,
  },
  {
    id: 'nairobi',
    city: 'Nairobi',
    title: 'Saving on the go',
    topic: 'Saving habits',
    status: 'coming-soon',
    pin: { lat: -1.29, lng: 36.82 },
    icon: 'smartphone',
    color: 'violet',
    progress: { done: 0, total: 0 },
    nextLesson: null,
    current: false,
  },
  {
    id: 'mumbai',
    city: 'Mumbai',
    title: 'Why gold glitters',
    topic: 'Gold & long horizons',
    status: 'coming-soon',
    pin: { lat: 19.08, lng: 72.88 },
    icon: 'database',
    color: 'orange',
    progress: { done: 0, total: 0 },
    nextLesson: null,
    current: false,
  },
];

// ponytail: local mock, replaced by the learner profile API (topic C).
export const LEARNER: Learner = { name: 'Alex', profileLabel: 'first-time investor', streak: 5, xp: 120 };

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
