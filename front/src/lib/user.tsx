import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { resetProfileWrites } from '@/hooks/useOnboarding';
import { resetPendingTarget } from '@/hooks/useOpenLearn';
import { setAtlasDot } from '@/lib/atlasOrb';
import { setSummary } from '@/lib/learningPath';
import { acquireSession, getDeviceId, releaseSession, startHeartbeat, type HeartbeatHandle } from '@/lib/session';

export const PINNED_USER_ID = process.env.EXPO_PUBLIC_USER_ID;
export const DEFAULT_USER_ID = 'demo-user';

export type CurrentUserContextValue = {
  userId: string;
  isLoggedIn: boolean;
  isReady: boolean;
  deviceId: string | null;
  conflictNotice: string | null;
  chooseUser: (userId: string) => Promise<void>;
  logOut: (opts?: { conflict?: boolean }) => Promise<void>;
  clearConflictNotice: () => void;
};

/** Reset client-side module-level state when logging out or switching accounts. */
export function resetClientUserState(): void {
  setSummary(null);
  resetProfileWrites();
  resetPendingTarget();
  setAtlasDot(false);
}

const fallbackUser = PINNED_USER_ID || DEFAULT_USER_ID;
const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export const CurrentUserContext = createContext<CurrentUserContextValue>({
  userId: fallbackUser,
  isLoggedIn: true,
  isReady: true,
  deviceId: null,
  conflictNotice: null,
  chooseUser: async () => {},
  logOut: async () => {},
  clearConflictNotice: () => {},
});

export function CurrentUserProvider({
  children,
  initialUserId,
}: {
  children: ReactNode;
  initialUserId?: string | null;
}) {
  const defaultInitialUser =
    initialUserId !== undefined
      ? (initialUserId ?? '')
      : (PINNED_USER_ID || (isTestEnv ? DEFAULT_USER_ID : ''));
  const [userId, setUserId] = useState<string>(defaultInitialUser);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(Boolean(defaultInitialUser));
  const [isReady, setIsReady] = useState<boolean>(Boolean(isTestEnv && !PINNED_USER_ID));
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const heartbeatRef = useRef<HeartbeatHandle | null>(null);
  const activeUserRef = useRef<string>(userId);
  const activeDeviceRef = useRef<string | null>(deviceId);

  useEffect(() => {
    activeUserRef.current = userId;
    activeDeviceRef.current = deviceId;
  }, [userId, deviceId]);

  const stopActiveHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      heartbeatRef.current.stop();
      heartbeatRef.current = null;
    }
  }, []);

  const logOut = useCallback(
    async (opts?: { conflict?: boolean }) => {
      stopActiveHeartbeat();
      const current = activeUserRef.current;
      const devId = activeDeviceRef.current;
      if (current && devId) {
        void releaseSession(current, devId);
      }
      resetClientUserState();
      setUserId('');
      setIsLoggedIn(false);
      if (opts?.conflict) {
        setConflictNotice('Someone else is using this account');
      }
    },
    [stopActiveHeartbeat],
  );

  const chooseUser = useCallback(
    async (targetUserId: string) => {
      stopActiveHeartbeat();
      const devId = deviceId || (await getDeviceId());
      if (!deviceId) setDeviceId(devId);

      const session = await acquireSession(targetUserId, devId);
      setConflictNotice(null);
      setUserId(targetUserId);
      setIsLoggedIn(true);

      heartbeatRef.current = startHeartbeat(targetUserId, devId, session.heartbeatMs, () => {
        void logOut({ conflict: true });
      });
    },
    [deviceId, logOut, stopActiveHeartbeat],
  );

  useEffect(() => {
    let cancelled = false;
    getDeviceId().then(async (id) => {
      if (cancelled) return;
      setDeviceId(id);

      if (PINNED_USER_ID) {
        try {
          const session = await acquireSession(PINNED_USER_ID, id);
          if (!cancelled) {
            setUserId(PINNED_USER_ID);
            setIsLoggedIn(true);
            heartbeatRef.current = startHeartbeat(PINNED_USER_ID, id, session.heartbeatMs, () => {
              void logOut({ conflict: true });
            });
          }
        } catch {
          // If acquire fails for pinned user, fall back to pinned user directly
          if (!cancelled) {
            setUserId(PINNED_USER_ID);
            setIsLoggedIn(true);
          }
        }
      }
      if (!cancelled) setIsReady(true);
    });

    return () => {
      cancelled = true;
      stopActiveHeartbeat();
    };
  }, [logOut, stopActiveHeartbeat]);

  const clearConflictNotice = useCallback(() => {
    setConflictNotice(null);
  }, []);

  const value = useMemo(
    () => ({
      userId,
      isLoggedIn,
      isReady,
      deviceId,
      conflictNotice,
      chooseUser,
      logOut,
      clearConflictNotice,
    }),
    [userId, isLoggedIn, isReady, deviceId, conflictNotice, chooseUser, logOut, clearConflictNotice],
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  return useContext(CurrentUserContext);
}
