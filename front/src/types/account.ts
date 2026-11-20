import type { AVATAR_SVG } from '@/components/profile/avatarSvg';

/** One of the illustrated avatars: m1–m3 male, f1–f3 female. */
export type AvatarId = keyof typeof AVATAR_SVG;

/** GET /api/users/{userId}/account. The bank owns the name; only the avatar can change. */
export type Account = {
  userId: string;
  firstName: string;
  lastName: string;
  avatar: AvatarId;
};

/** GET /api/users/{userId}/stats?today=YYYY-MM-DD. All derived from finished lessons. */
export type Stats = {
  /** Days in a row up to today, or up to yesterday if there is no lesson today yet. */
  currentStreak: number;
  longestStreak: number;
  doneToday: boolean;
  /** Monday to Sunday of this week: true where a lesson was done. */
  week: boolean[];
  totalXp: number;
  lessonsCompleted: number;
};
