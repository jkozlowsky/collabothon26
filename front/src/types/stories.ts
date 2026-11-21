import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import type { storyColors } from '@/constants/theme';

/** Key of a `story/*` colour in the Design Kit. */
export type StoryColor = keyof typeof storyColors;

/** One item of GET /api/stories (.plans/f4-f5-lessons-spec.md §6, extended for the globe in globe-home-spec.md §6). */
export type Story = {
  id: string;
  city: string;
  /** Story title shown on cards and on the "done" callout. Not in the spec §6 example; the cards need it. */
  title: string;
  topic: string;
  status: 'available' | 'coming-soon';
  pin: { lat: number; lng: number };
  /** Line icon name from the Design Kit (Feather set). */
  icon: ComponentProps<typeof Feather>['name'];
  color: StoryColor;
  progress: { done: number; total: number };
  /** Null when the story is finished or coming soon. */
  nextLesson: { id: string; title: string; minutes: number } | null;
  /** Exactly one story is the current one. */
  current: boolean;
};

/** Header data from the learner profile (topic C). */
export type Learner = { name: string; profileLabel: string; streak: number; xp: number };
