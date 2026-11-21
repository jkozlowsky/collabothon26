// Contract for Duel Mode v2.
// Mirrors the backend package com.collabothon.back.duel and
// .plans/duel-v2-contract.md §3-§4 & §8.

import type { SliderModel, SliderParam, Step } from '@/types/lessons';

export type { AvatarId } from '@/types/account';

export type DuelMode = 'HUMAN' | 'SOLO';
export type StoryColor = 'rose' | 'violet' | 'orange' | 'teal' | 'slate';

/** GET /api/duel/categories?userId= — lobby list, stories.json order. */
export type DuelCategory = {
  story: string;            // "berlin"
  name: string;             // "Inflation & savings" (full, never truncated in UI)
  icon: string;             // Feather icon name from stories.json
  color: StoryColor;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
};

export type PlayerCard = {
  name: string;             // first name from account
  avatar: 'm1' | 'm2' | 'm3' | 'f1' | 'f2' | 'f3';
  levels: Record<string, number>;   // story id → level; UI shows the level of the current question's category
};

/** Duel-only: a chart drawn from a lesson model with fixed params; the player answers one number with a slider. */
export type ChartStep = {
  type: 'chart';
  id: string;
  prompt: string;
  model: SliderModel;                       // same models as slider-chart (front/src/lib/models.ts)
  params: Record<string, SliderParam>;      // fixed values; not editable in the duel
  output: { label: string; unit: string };
  input: { kind: 'slider'; min: number; max: number; step: number; unit: string };
  answer: number;
  tolerance: number;
  explanation: string;
};

/**
 * DuelStep (sent before answering) = Step | ChartStep with answer fields removed:
 * quiz.correctIndex, quiz.explanation, predict.answer, predict.reveal, predict.tolerance,
 * chart.answer, chart.tolerance, chart.explanation, *.explanation.
 * sort: items are shuffled strings without bucket.
 * match: left and right are shuffled arrays of strings.
 * Allowed duel types: quiz, predict, chart, sort, match.
 */
export type DuelQuizStep = {
  type: 'quiz';
  id: string;
  prompt: string;
  options: string[];
};

export type DuelPredictStep = {
  type: 'predict';
  id: string;
  prompt: string;
  input: { kind: 'slider'; min: number; max: number; step: number; unit: string };
};

export type DuelChartStep = {
  type: 'chart';
  id: string;
  prompt: string;
  model: SliderModel;
  params: Record<string, SliderParam>;
  output: { label: string; unit: string };
  input: { kind: 'slider'; min: number; max: number; step: number; unit: string };
};

export type DuelSortStep = {
  type: 'sort';
  id: string;
  prompt?: string;
  buckets: [string, string];
  items: string[];
};

export type DuelMatchStep = {
  type: 'match';
  id: string;
  prompt?: string;
  left: string[];
  right: string[];
};

export type DuelStep =
  | DuelQuizStep
  | DuelPredictStep
  | DuelChartStep
  | DuelSortStep
  | DuelMatchStep;

/** Question as sent before answering: answer fields removed. */
export type DuelQuestion = {
  index: number;            // 0..5
  category: string;         // story id of this question
  step: DuelStep;
  deadline: number;         // epoch ms
  timeLimitMs: number;
};

export type DuelAnswer =
  | { option: number }      // quiz: index in the options as sent
  | { value: number }       // predict, chart
  | { buckets: number[] }   // sort: bucket (0/1) for each item in the order it was shown
  | { pairs: number[] };    // match: for each left[i], the index into right as shown

/** POST /api/duel/matches */
export type StartMatchRequest = {
  userId: string;
  categories: string[];     // 1..4 story ids
  mode: DuelMode;
};

export type DotResult = boolean | null;

export type RivalSnapshot = {
  answered: number;
  results: DotResult[];     // length 6
};

export type MatchStart = {
  matchId: number;
  mode: DuelMode;
  categories: string[];
  you: PlayerCard;
  rival: PlayerCard | null; // null in SOLO
  questionCount: number;
  question: DuelQuestion;
};

/** POST /api/duel/matches/{id}/answers */
export type AnswerRequest = {
  userId: string;
  index: number;
} & DuelAnswer;

export type AnswerResult = {
  index: number;
  correct: boolean;
  timedOut: boolean;
  nextQuestion: DuelQuestion | null;
  rivalProgress: RivalSnapshot | null;
  yourFinal: { score: number; xpGained: number } | null;   // set once all 6 are answered
  finished: boolean;                                       // match settled (rival done too)
};

/** GET /api/duel/matches/{id}/state?userId= */
export type MatchState = {
  matchId: number;
  mode: DuelMode;
  categories: string[];
  you: PlayerCard;
  rival: PlayerCard | null;
  questionCount: number;
  yourResults: DotResult[];
  question: DuelQuestion | null;      // null once you answered all
  rivalProgress: RivalSnapshot | null;
  yourFinal: { score: number; xpGained: number } | null;
  finished: boolean;
};

export type MatchOutcome = 'WIN' | 'DRAW' | 'LOSS' | 'SOLO';

export type ReviewStep = (Step | ChartStep) & {
  shownItems?: string[];
  shownLeft?: string[];
  shownRight?: string[];
};

export type ReviewItem = {
  index: number;
  category: string;
  step: ReviewStep;         // full lesson-format step incl. answer fields and shown orders
  yourAnswer: DuelAnswer | null;      // null = timed out
  correct: boolean;
  lessonId: string;         // → /lesson/[id]
  lessonTitle: string;
};

/** GET /api/duel/matches/{id}?userId= */
export type MatchEnd = {
  matchId: number;
  mode: DuelMode;
  categories: string[];
  outcome: MatchOutcome;
  score: number;
  rivalScore: number | null;
  you: PlayerCard;
  rival: PlayerCard | null;
  xpGained: number;
  xpByCategory: Record<string, number>;
  review: ReviewItem[];     // in question order; UI puts wrong ones first
};

/** GET /api/duel/matches?userId= */
export type MatchSummary = {
  matchId: number;
  mode: DuelMode;
  categories: string[];
  rival: PlayerCard | null;
  status: 'PLAYING' | 'RIVAL_PLAYING' | 'FINISHED';
  seen: boolean;
  score: number;
  rivalScore: number | null;
  outcome: MatchOutcome | null;
  xpGained: number;
  startedAt: string;        // ISO
};

/** GET /api/duel/rankings?userId= */
export type RankingRow = {
  rank: number;
  userId: string;
  name: string;
  avatar: PlayerCard['avatar'];
  level: number;
  weeklyXp: number;
};

export type Rankings = {
  top: RankingRow[];
  me: RankingRow | null;
};

/** GET /api/xp/{userId}/categories */
export type CategoryXp = {
  category: string;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  weeklyXp: number;
};
