import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import type { storyColors } from '@/constants/theme';
import type { LessonSummary } from '@/types/lessons';

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
export type Learner = { name: string; streak: number; xp: number };

/** Landmark shapes the story hero can draw, one per city with content: tower (Seoul), gate (Berlin), raised (São Paulo), lattice (Tokyo). */
export type LandmarkKind = 'tower' | 'gate' | 'raised' | 'lattice';

/** One item of GET /api/stories as the story screen reads it: content from stories.json plus the user's lessons. */
export type StoryPage = {
  id: string;
  city: string;
  status: 'available' | 'coming-soon';
  /** The path's own name ("Hype & leverage"). */
  category: string;
  /** Line icon name from the Design Kit (Feather set). */
  icon: ComponentProps<typeof Feather>['name'];
  /** Learning area shown as the story's title and as its onboarding chip ("Investing"); the city moves to the overline. (`category` is the duel's name for the story.) */
  area?: string;
  /** No character: the story is about the user's own (mock) bank data, and the city is only the backdrop. */
  personal?: boolean;
  topic: string;
  color: StoryColor;
  character: { name: string; age: number; role: string; place?: string; savings?: string } | null;
  /** The city's landmark drawn over the hero skyline; `at` is its horizontal position, 0–1. */
  landmark?: { kind: LandmarkKind; at: number };
  /** The situation the story starts from, shown on the character card. */
  intro?: string;
  /** "Words from {city}": local terms the lessons explain. */
  words?: { native: string; meaning: string }[];
  lessons: LessonSummary[];
  progress: { done: number; total: number };
};
