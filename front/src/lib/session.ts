import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

import { api, ApiError } from '@/lib/api';
import type { AvatarId } from '@/types/account';

export const DEVICE_ID_KEY = 'fq_device_id';

export type DemoAccountStatus = 'free' | 'mine' | 'in-use';

export type DemoAccount = {
  userId: string;
  firstName: string;
  lastName: string;
  avatar: AvatarId;
  status: DemoAccountStatus;
};

export type SessionResponse = {
  userId: string;
  ttlMs: number;
  heartbeatMs: number;
};

let cachedDeviceId: string | null = null;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Device id: random UUID generated once per device / browser context and stored
 * in local storage (AsyncStorage). Identifies the physical device or browser tab session.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch {
    // Storage unavailable (private mode, quota): carry on with a fresh id.
  }

  const fresh = generateUuid();
  cachedDeviceId = fresh;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  } catch {
    // Not persisted: the id still holds for this run from the cache.
  }
  return fresh;
}

export function resetCachedDeviceIdForTests(): void {
  cachedDeviceId = null;
}

export async function fetchDemoAccounts(deviceId: string): Promise<DemoAccount[]> {
  return api<DemoAccount[]>(`/api/demo-accounts?deviceId=${encodeURIComponent(deviceId)}`);
}

export async function acquireSession(userId: string, deviceId: string): Promise<SessionResponse> {
  return api<SessionResponse>(`/api/users/${encodeURIComponent(userId)}/session`, {
    method: 'POST',
    body: JSON.stringify({ deviceId }),
  });
}

export async function heartbeatSession(userId: string, deviceId: string): Promise<SessionResponse> {
  return api<SessionResponse>(`/api/users/${encodeURIComponent(userId)}/session`, {
    method: 'PUT',
    body: JSON.stringify({ deviceId }),
  });
}

export async function releaseSession(userId: string, deviceId: string): Promise<void> {
  try {
    await api<void>(`/api/users/${encodeURIComponent(userId)}/session?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Best effort: a session that was not released expires by its TTL on the backend.
  }
}

export type HeartbeatHandle = {
  stop: () => void;
  sendNow: () => Promise<void>;
};

/**
 * Sends a session heartbeat every heartbeatMs while the account is open and the app is in the foreground.
 * On 409 (someone else acquired this account), invokes onConflict and stops.
 */
export function startHeartbeat(
  userId: string,
  deviceId: string,
  heartbeatMs: number,
  onConflict: () => void,
): HeartbeatHandle {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;

  const tick = async () => {
    if (stopped || inFlight) return;
    if (AppState.currentState === 'background' || AppState.currentState === 'inactive') {
      // In background: wait for next tick or until foregrounded
      scheduleNext();
      return;
    }

    inFlight = true;
    try {
      await heartbeatSession(userId, deviceId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        stop();
        onConflict();
        return;
      }
      // Other transient errors: keep heartbeat ticking
    } finally {
      inFlight = false;
      if (!stopped) {
        scheduleNext();
      }
    }
  };

  const scheduleNext = () => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, heartbeatMs);
  };

  const onAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active' && !stopped) {
      void tick();
    }
  };

  const sub = AppState.addEventListener ? AppState.addEventListener('change', onAppStateChange) : null;
  scheduleNext();

  const stop = () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    sub?.remove?.();
  };

  return {
    stop,
    sendNow: tick,
  };
}
