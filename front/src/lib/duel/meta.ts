import { storyColors, tints } from '@/constants/theme';
import type { DuelMode, StoryColor } from '@/types/duel';

export type CategoryMeta = {
  story: string;
  name: string;
  icon: string;
  color: StoryColor;
  accent: string;
  tint: string;
};

export const STORY_CATEGORIES: Record<string, CategoryMeta> = {
  seoul: {
    story: 'seoul',
    name: 'Hype & leverage',
    icon: 'message-circle',
    color: 'violet',
    accent: storyColors.violet,
    tint: tints.violet,
  },
  berlin: {
    story: 'berlin',
    name: 'Inflation & savings',
    icon: 'shield',
    color: 'teal',
    accent: storyColors.teal,
    tint: tints.teal,
  },
  'sao-paulo': {
    story: 'sao-paulo',
    name: 'Instalments & debt',
    icon: 'credit-card',
    color: 'orange',
    accent: storyColors.orange,
    tint: tints.orange,
  },
  tokyo: {
    story: 'tokyo',
    name: 'Diversification',
    icon: 'globe',
    color: 'rose',
    accent: storyColors.rose,
    tint: tints.rose,
  },
  'buenos-aires': {
    story: 'buenos-aires',
    name: 'Fast inflation',
    icon: 'tag',
    color: 'orange',
    accent: storyColors.orange,
    tint: tints.orange,
  },
  nairobi: {
    story: 'nairobi',
    name: 'Small savings',
    icon: 'smartphone',
    color: 'violet',
    accent: storyColors.violet,
    tint: tints.violet,
  },
  mumbai: {
    story: 'mumbai',
    name: 'Gold',
    icon: 'database',
    color: 'orange',
    accent: storyColors.orange,
    tint: tints.orange,
  },
};

export function getStoryCategoryMeta(story: string): CategoryMeta {
  return (
    STORY_CATEGORIES[story] ?? {
      story,
      name: story,
      icon: 'shield',
      color: 'slate',
      accent: storyColors.slate,
      tint: tints.slate,
    }
  );
}

export function isDuelMode(value: string | undefined): value is DuelMode {
  return value === 'HUMAN' || value === 'SOLO';
}

export function formatNumber(n: number): string {
  const abs = Math.abs(Math.round(n));
  const formatted = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return n < 0 ? `−${formatted}` : formatted;
}

export function formatSigned(n: number): string {
  const rounded = Math.round(n);
  if (rounded > 0) return `+${formatNumber(rounded)}`;
  if (rounded < 0) return formatNumber(rounded);
  return '0';
}

export function formatClock(totalSec: number): string {
  const clamped = Math.max(0, Math.ceil(totalSec));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** ISO week number and time remaining until Monday 00:00 (Europe/Warsaw). */
export function getWeeklyLeagueClock(now: Date = new Date()): {
  week: number;
  days: number;
  hours: number;
  shortLabel: string;
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = Number(get('year')) || now.getUTCFullYear();
  const month = Number(get('month')) || now.getUTCMonth() + 1;
  const day = Number(get('day')) || now.getUTCDate();
  const hour = Number(get('hour')) || 0;
  const minute = Number(get('minute')) || 0;

  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const isoDay = weekdayMap[get('weekday')] ?? ((now.getUTCDay() + 6) % 7) + 1;

  const totalWeekMinutes = 7 * 24 * 60;
  const elapsedMinutes = (isoDay - 1) * 24 * 60 + hour * 60 + minute;
  const remainingMinutes = Math.max(0, totalWeekMinutes - elapsedMinutes);
  const days = Math.floor(remainingMinutes / (24 * 60));
  const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  const shortLabel = days > 0 ? `${days}d ${hours}h left` : `${Math.max(1, hours)}h left`;
  return { week, days, hours, shortLabel };
}

/**
 * Format a full name into "First L." (first name + first letter of the last name with a dot).
 * If there is only one word / no last name, returns just the first name.
 * Handles extra whitespace and multi-part last names.
 */
export function formatPlayerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

