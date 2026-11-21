// Contract for F8 duel mode. Mirrors the backend package com.collabothon.back.duel and
// .plans/duel-mode-spec.md §12 (REST + polling; the rival is simulated server-side).
// Change both sides together.

import type { AvatarId } from '@/types/account';

export type DuelMode = 'HUMAN' | 'BOT' | 'SOLO';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type CategorySlug = 'instruments' | 'risk' | 'costs' | 'money-basics' | 'psychology';
export type CategoryIcon = 'trend' | 'pie' | 'percent' | 'coins' | 'brain';
export type Lang = 'en' | 'pl';
/** Player avatar from the bank account (GET /api/users/{id}/account): m1–m3, f1–f3. */
export type { AvatarId } from '@/types/account';

// ---------- REST ----------

/** GET /api/duel/categories?userId=&lang= */
export type DuelCategory = {
  slug: CategorySlug;
  name: string;
  icon: CategoryIcon;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  elo: number;
  humanMatches: number;
  /** true once humanMatches >= 5 */
  calibrated: boolean;
};

export type RankingScope = 'category' | 'overall' | 'friends' | 'weekly';

export type RankingRow = {
  rank: number;
  userId: string;
  name: string;
  avatar: AvatarId;
  level: number;
  elo: number;
  /** Elo for category/overall/friends; Elo gained this week for weekly. */
  value: number;
};

/** GET /api/duel/rankings?scope=&category=&userId= */
export type Rankings = {
  top: RankingRow[];
  /** null when the user is not ranked yet (calibrating). */
  me: RankingRow | null;
};

/** GET /api/duel/progress/{userId} — contract for profile and F6/F7. */
export type DuelProgress = {
  category: CategorySlug;
  xp: number;
  level: number;
  elo: number;
  accuracyLast30d: number | null;
}[];

// ---------- REST: a match is played with plain requests ----------

/** POST /api/duel/matches */
export type StartMatchRequest = {
  userId: string;
  category: CategorySlug;
  mode: DuelMode;
  lang: Lang;
};

/** POST /api/duel/matches/{id}/answers; option is the index in the order the player saw. */
export type AnswerRequest = {
  userId: string;
  index: number;
  option: number;
};

export type PlayerCard = {
  name: string;
  level: number;
  /** null for bots */
  elo: number | null;
  /** null for bots (the UI shows the bot icon). */
  avatar: AvatarId | null;
  isBot: boolean;
};

/** Per-question result as seen by others: true correct, false wrong or timed out, null not answered yet. */
export type DotResult = boolean | null;

export type ReviewItem = {
  prompt: string;
  /** In the shuffled order the player saw. */
  options: string[];
  /** null when the player did not answer in time. */
  yourOption: number | null;
  correctOption: number;
  explanation: string;
};

export type MatchOutcome = 'WIN' | 'DRAW' | 'LOSS' | 'SOLO';

export type MatchEnd = {
  matchId: number;
  mode: DuelMode;
  category: CategorySlug;
  outcome: MatchOutcome;
  score: number;
  /** null in solo */
  rivalScore: number | null;
  rival: PlayerCard | null;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  xpIntoLevel: number;
  xpForLevel: number;
  /** null unless mode is HUMAN */
  eloBefore: number | null;
  eloAfter: number | null;
  review: ReviewItem[];
};

/** deadline is epoch ms; the client draws its countdown from it. */
export type Question = { index: number; prompt: string; options: string[]; deadline: number };

/** The rival's answers so far; the rival is simulated, so `connected` is always true. */
export type RivalSnapshot = { answered: number; results: DotResult[]; connected: boolean };

/** POST /api/duel/matches response: the match and its first question. */
export type MatchStart = {
  matchId: number;
  mode: DuelMode;
  category: CategorySlug;
  you: PlayerCard;
  /** null in solo */
  rival: PlayerCard | null;
  questionCount: number;
  question: Question;
};

/** POST /api/duel/matches/{id}/answers response. */
export type AnswerResult = {
  index: number;
  correct: boolean;
  timedOut: boolean;
  /** null once you answered everything */
  nextQuestion: Question | null;
  /** null in solo */
  rivalProgress: RivalSnapshot | null;
  /** true when the match is settled and GET /api/duel/matches/{id} returns the result */
  finished: boolean;
};

/** GET /api/duel/matches/{id}/state?userId=&lang= */
export type MatchState = {
  matchId: number;
  mode: DuelMode;
  category: CategorySlug;
  you: PlayerCard;
  rival: PlayerCard | null;
  questionCount: number;
  yourResults: DotResult[];
  /** null when you already finished all questions */
  question: Question | null;
  rivalProgress: RivalSnapshot | null;
  finished: boolean;
};

/**
 * What the match reducer consumes. The hook turns each REST response into these events
 * (a start response becomes match.start + question, an answer response answer.result + question, ...).
 */
export type ServerMessage =
  | {
      type: 'match.start';
      matchId: number;
      mode: DuelMode;
      category: CategorySlug;
      you: PlayerCard;
      rival: PlayerCard | null;
      questionCount: number;
    }
  | ({ type: 'question' } & Question)
  | { type: 'answer.result'; index: number; correct: boolean; timedOut: boolean }
  | ({ type: 'rival.progress' } & RivalSnapshot)
  | ({ type: 'match.state' } & MatchState)
  | { type: 'match.waiting' }
  | ({ type: 'match.end' } & MatchEnd)
  | { type: 'error'; code: string; message: string };
