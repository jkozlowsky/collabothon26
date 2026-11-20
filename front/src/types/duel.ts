// Contract for F8 duel mode. Mirrors the backend package com.collabothon.back.duel,
// the STOMP transport in .plans/workers/stomp-contract.md, and .plans/duel-mode-spec.md §12.
// Change both sides together.

export type DuelMode = 'HUMAN' | 'BOT' | 'SOLO';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type CategorySlug = 'instruments' | 'risk' | 'costs' | 'money-basics' | 'psychology';
export type CategoryIcon = 'trend' | 'pie' | 'percent' | 'coins' | 'brain';
export type Lang = 'en' | 'pl';
/** Player avatar from the bank account (GET /api/users/{id}/account): m1–m3, f1–f3. */
export type { AvatarId } from '@/types/account';
import type { AvatarId } from '@/types/account';

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
  /** null for bots (the UI shows the bot icon). */
  avatar: AvatarId | null;
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

// ---------- STOMP over WebSocket: ws(s)://<backend>/ws/duel (CONNECT headers: userId, lang; SEND /app/duel/<type>; SUB /user/queue/duel) ----------

export type ClientMessage =
  | { type: 'queue.join'; category: CategorySlug; mode: DuelMode }
  | { type: 'queue.leave' }
  | { type: 'queue.acceptBot' }
  | { type: 'answer'; matchId: number; index: number; option: number }
  | { type: 'match.resume'; matchId: number };

export type PlayerCard = {
  name: string;
  level: number;
  /** null for bots */
  elo: number | null;
  avatar: AvatarId;
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

export type ServerMessage =
  | { type: 'queue.waiting'; elapsedSec: number; widened: boolean }
  | { type: 'queue.botOffer' }
  | {
      type: 'match.start';
      matchId: number;
      mode: DuelMode;
      category: CategorySlug;
      you: PlayerCard;
      rival: PlayerCard | null;
      questionCount: number;
    }
  /** deadline is epoch ms; the client draws its countdown from it. */
  | { type: 'question'; index: number; prompt: string; options: string[]; deadline: number }
  | { type: 'answer.result'; index: number; correct: boolean; timedOut: boolean }
  | { type: 'rival.progress'; answered: number; results: DotResult[]; connected: boolean }
  | {
      type: 'match.state';
      matchId: number;
      mode: DuelMode;
      category: CategorySlug;
      you: PlayerCard;
      rival: PlayerCard | null;
      questionCount: number;
      yourResults: DotResult[];
      /** null when you already finished all questions */
      question: { index: number; prompt: string; options: string[]; deadline: number } | null;
      rivalProgress: { answered: number; results: DotResult[]; connected: boolean } | null;
    }
  | { type: 'match.waiting' }
  | ({ type: 'match.end' } & MatchEnd)
  | { type: 'error'; code: string; message: string };
