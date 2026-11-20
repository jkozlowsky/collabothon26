import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { USER_ID } from '@/lib/user';
import type { Account, AvatarId, Stats } from '@/types/account';

type AccountState = {
  /** Null until loaded, or if the bank has no such customer (callers fall back to the bank seed). */
  account: Account | null;
  stats: Stats | null;
  /** Set when a finished lesson grew the streak; the profile animates it once, then clears it. */
  streakBump: { from: number; to: number } | null;
  clearStreakBump: () => void;
  setAvatar: (avatar: AvatarId) => void;
  refreshStats: () => void;
  /** Demo helper: back to the seeded progress (4-day streak ending yesterday). */
  resetProgress: () => void;
};

const AccountContext = createContext<AccountState | null>(null);

const userPath = `/api/users/${encodeURIComponent(USER_ID)}`;

/** The user's local date as YYYY-MM-DD: streak days follow the phone's calendar, not the server's. */
export function localDate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Responses are checked before use, so a stub or an error page never ends up rendered as a name.
const isAccount = (a: unknown): a is Account => typeof (a as Account | null)?.firstName === 'string';
const isStats = (s: unknown): s is Stats => typeof (s as Stats | null)?.currentStreak === 'number';

/** Bank account (name, avatar) and learning progress (streak, XP) of the signed-in user. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [streakBump, setStreakBump] = useState<AccountState['streakBump']>(null);

  useEffect(() => {
    let cancelled = false;
    api<unknown>(`${userPath}/account`)
      .then((a) => !cancelled && isAccount(a) && setAccount(a))
      .catch((e: unknown) => console.warn('Could not load account', e));
    api<unknown>(`${userPath}/stats?today=${localDate()}`)
      .then((s) => !cancelled && isStats(s) && setStats(s))
      .catch((e: unknown) => console.warn('Could not load stats', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const setAvatar = useCallback((avatar: AvatarId) => {
    // Optimistic: the picker closes at once; a failed save only logs.
    setAccount((a) => a && { ...a, avatar });
    api(`${userPath}/account`, { method: 'PATCH', body: JSON.stringify({ avatar }) }).catch((e: unknown) =>
      console.warn('Could not save avatar', e),
    );
  }, []);

  const refreshStats = useCallback(() => {
    api<unknown>(`${userPath}/stats?today=${localDate()}`)
      .then((updated) => {
        if (!isStats(updated)) return;
        const before = stats?.currentStreak ?? 0;
        setStats(updated);
        if (updated.currentStreak > before) setStreakBump({ from: before, to: updated.currentStreak });
      })
      .catch((e: unknown) => console.warn('Could not refresh stats', e));
  }, [stats]);

  const resetProgress = useCallback(() => {
    setStreakBump(null);
    api<unknown>(`${userPath}/progress/reset?today=${localDate()}`, { method: 'POST' })
      .then((s) => isStats(s) && setStats(s))
      .catch((e: unknown) => console.warn('Could not reset progress', e));
  }, []);

  const clearStreakBump = useCallback(() => setStreakBump(null), []);

  const value = useMemo(
    () => ({ account, stats, streakBump, clearStreakBump, setAvatar, refreshStats, resetProgress }),
    [account, stats, streakBump, clearStreakBump, setAvatar, refreshStats, resetProgress],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>');
  return ctx;
}
