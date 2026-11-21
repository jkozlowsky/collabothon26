import { colors, tints } from '@/constants/theme';
import type { BankIconName } from '@/types/bank';
import type { CategoryIcon, CategorySlug, DuelMode } from '@/types/duel';

/** The backend sends a CategoryIcon; the shared Icon set draws it. */
const CATEGORY_ICONS: Record<CategoryIcon, BankIconName> = {
  trend: 'trending',
  pie: 'pie',
  percent: 'percent',
  coins: 'coins',
  brain: 'brain',
};

export function categoryIconName(icon: CategoryIcon): BankIconName {
  return CATEGORY_ICONS[icon];
}

export type CategoryMeta = {
  slug: CategorySlug;
  name: string;
  shortName: string;
  icon: BankIconName;
  accent: string;
  tint: string;
};

export const CATEGORY_LIST: CategoryMeta[] = [
  {
    slug: 'instruments',
    name: 'Instruments',
    shortName: 'Instruments',
    icon: 'trending',
    accent: colors.storyTeal,
    tint: tints.teal,
  },
  {
    slug: 'risk',
    name: 'Risk & diversification',
    shortName: 'Risk',
    icon: 'pie',
    accent: colors.storyViolet,
    tint: tints.violet,
  },
  {
    slug: 'costs',
    name: 'Costs & taxes',
    shortName: 'Costs',
    icon: 'percent',
    accent: colors.storyOrange,
    tint: tints.orange,
  },
  {
    slug: 'money-basics',
    name: 'Inflation & compounding',
    shortName: 'Money basics',
    icon: 'coins',
    accent: colors.feedbackXp,
    tint: tints.xp,
  },
  {
    slug: 'psychology',
    name: 'Investor psychology',
    shortName: 'Psychology',
    icon: 'brain',
    accent: colors.storyRose,
    tint: tints.rose,
  },
];

export const CATEGORY_BY_SLUG: Record<CategorySlug, CategoryMeta> = Object.fromEntries(
  CATEGORY_LIST.map((c) => [c.slug, c]),
) as Record<CategorySlug, CategoryMeta>;

export function getCategoryMeta(slug: CategorySlug): CategoryMeta {
  return CATEGORY_BY_SLUG[slug] ?? CATEGORY_LIST[0];
}

export function isCategorySlug(value: string | undefined): value is CategorySlug {
  return !!value && value in CATEGORY_BY_SLUG;
}

export function isDuelMode(value: string | undefined): value is DuelMode {
  return value === 'HUMAN' || value === 'BOT' || value === 'SOLO';
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

/** ISO week number and time remaining until Monday 00:00 (Europe/Berlin). */
export function getWeeklyLeagueClock(now: Date = new Date()): {
  week: number;
  days: number;
  hours: number;
  shortLabel: string;
} {
  // Compute Europe/Berlin wall-clock components safely via Intl.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
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

  // ISO day of week: Mon=1 .. Sun=7
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const isoDay = weekdayMap[get('weekday')] ?? ((now.getUTCDay() + 6) % 7) + 1;

  // Remaining minutes in the Mon 00:00 -> next Mon 00:00 week
  const totalWeekMinutes = 7 * 24 * 60;
  const elapsedMinutes = (isoDay - 1) * 24 * 60 + hour * 60 + minute;
  const remainingMinutes = Math.max(0, totalWeekMinutes - elapsedMinutes);
  const days = Math.floor(remainingMinutes / (24 * 60));
  const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);

  // ISO 8601 week number for (year, month, day)
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  const shortLabel = days > 0 ? `${days} d ${hours} h` : `${Math.max(1, hours)} h`;
  return { week, days, hours, shortLabel };
}
