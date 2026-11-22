import { useCallback, useEffect, useRef, useState } from 'react';

import { API_URL } from '@/lib/api';
import type { DuelSocketMessage, DuelSocketRequest } from '@/types/duel';

export type DuelSocketStatus = 'idle' | 'connecting' | 'open' | 'closed';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 8000;
const PING_INTERVAL_MS = 25_000;

/** `http(s)://host` → `ws(s)://host/ws/duel?userId=&deviceId=`. */
export function duelSocketUrl(apiUrl: string, userId: string, deviceId: string): string {
  const base = apiUrl.replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}/ws/duel?userId=${encodeURIComponent(userId)}&deviceId=${encodeURIComponent(deviceId)}`;
}

/** Reconnect delay after `attempt` failed tries: 1 s, 2 s, 4 s, then 8 s at most. */
export function reconnectDelay(attempt: number): number {
  return Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
}

type Params = {
  userId: string;
  deviceId: string | null;
  /** Connect only while this is true (on the duel screens). */
  enabled: boolean;
  onMessage: (message: DuelSocketMessage) => void;
};

export type UseDuelSocketResult = {
  status: DuelSocketStatus;
  /** Sends when the socket is open; false when it is not. */
  send: (message: DuelSocketRequest) => boolean;
  /** Resolves true once the socket is open, false after `timeoutMs` or when it can no longer open. */
  waitForOpen: (timeoutMs: number) => Promise<boolean>;
};

/**
 * The live duel socket: connects while enabled, reconnects with backoff, pings to keep the connection alive. A
 * dropped socket never blocks play: answers go through REST and the match state is still polled.
 */
export function useDuelSocket({ userId, deviceId, enabled, onMessage }: Params): UseDuelSocketResult {
  const active = enabled && Boolean(userId) && Boolean(deviceId);
  const [status, setStatus] = useState<DuelSocketStatus>('idle');
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const activeRef = useRef(active);
  const openWaitersRef = useRef<((open: boolean) => void)[]>([]);

  useEffect(() => {
    onMessageRef.current = onMessage;
    activeRef.current = active;
  }, [onMessage, active]);

  useEffect(() => {
    if (!active) return;

    let disposed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    function connect() {
      if (disposed) return;
      setStatus('connecting');
      let socket: WebSocket;
      try {
        socket = new WebSocket(duelSocketUrl(API_URL, userId, deviceId as string));
      } catch {
        openWaitersRef.current.splice(0).forEach((resolve) => resolve(false));
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setStatus('open');
        openWaitersRef.current.splice(0).forEach((resolve) => resolve(true));
        pingTimer = setInterval(() => {
          if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'ping' }));
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (event: { data: unknown }) => {
        try {
          onMessageRef.current(JSON.parse(String(event.data)) as DuelSocketMessage);
        } catch {
          // Ignore a malformed push; the REST poll is the fallback.
        }
      };

      socket.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (socketRef.current === socket) socketRef.current = null;
        // A socket that never opened can't take a queue message: let callers fall back right away.
        openWaitersRef.current.splice(0).forEach((resolve) => resolve(false));
        if (disposed) return;
        setStatus('closed');
        scheduleReconnect();
      };

      socket.onerror = () => {
        // onclose follows and handles the reconnect.
      };
    }

    function scheduleReconnect() {
      if (disposed) return;
      reconnectTimer = setTimeout(connect, reconnectDelay(attempt));
      attempt += 1;
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      openWaitersRef.current.splice(0).forEach((resolve) => resolve(false));
    };
  }, [active, userId, deviceId]);

  const send = useCallback((message: DuelSocketRequest) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== 1) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const waitForOpen = useCallback((timeoutMs: number) => {
    if (!activeRef.current) return Promise.resolve(false);
    const socket = socketRef.current;
    if (socket && socket.readyState === 1) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        openWaitersRef.current = openWaitersRef.current.filter((waiter) => waiter !== done);
        resolve(false);
      }, timeoutMs);
      const done = (open: boolean) => {
        clearTimeout(timer);
        resolve(open);
      };
      openWaitersRef.current.push(done);
    });
  }, []);

  return { status: active ? status : 'idle', send, waitForOpen };
}
