import { Client, ReconnectionTimeMode, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { Platform } from 'react-native';

import { API_URL } from '@/lib/api';
import { USER_ID } from '@/lib/user';
import type { ClientMessage, Lang, ServerMessage } from '@/types/duel';

const DUEL_WS_PATH = '/ws/duel';
export const DUEL_SUBSCRIBE_DESTINATION = '/user/queue/duel';

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 5000;

/**
 * Pure-JS UTF-8 encoder used only if a React Native runtime does not expose global TextEncoder.
 */
export function encodeUtf8(input: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    let codePoint = input.charCodeAt(i);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = ((codePoint - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i += 1;
      }
    }
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Pure-JS UTF-8 decoder used only if a React Native runtime does not expose global TextDecoder.
 */
export function decodeUtf8(input?: ArrayBufferLike | ArrayBufferView): string {
  if (!input) return '';
  const bytes =
    input instanceof Uint8Array
      ? input
      : ArrayBuffer.isView(input)
        ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
        : new Uint8Array(input);

  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0 && i + 1 < bytes.length) {
      const cp = ((b0 & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      out += String.fromCharCode(cp);
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0 && i + 2 < bytes.length) {
      const cp = ((b0 & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      out += String.fromCharCode(cp);
      i += 3;
    } else if ((b0 & 0xf8) === 0xf0 && i + 3 < bytes.length) {
      const cp =
        ((b0 & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const offset = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff));
      i += 4;
    } else {
      out += '\ufffd';
      i += 1;
    }
  }
  return out;
}

/**
 * Ensures TextEncoder and TextDecoder exist on globalThis for @stomp/stompjs on RN runtimes
 * that do not ship them natively. No-op on browsers, Node, and runtimes with built-in support.
 */
export function ensureTextEncoding(): void {
  const g = globalThis as { TextEncoder?: unknown; TextDecoder?: unknown };
  if (typeof g.TextEncoder === 'undefined') {
    g.TextEncoder = class FallbackTextEncoder {
      readonly encoding = 'utf-8';
      encode(input = ''): Uint8Array {
        return encodeUtf8(input);
      }
    };
  }
  if (typeof g.TextDecoder === 'undefined') {
    g.TextDecoder = class FallbackTextDecoder {
      readonly encoding = 'utf-8';
      decode(input?: ArrayBufferLike | ArrayBufferView): string {
        return decodeUtf8(input);
      }
    };
  }
}

/**
 * Resolves the duel STOMP WebSocket endpoint URL:
 * 1. EXPO_PUBLIC_WS_URL if set.
 * 2. Otherwise API_URL with http -> ws and https -> wss (same host and port), plus /ws/duel.
 */
export function resolveDuelWsUrl(
  envWsUrl: string | undefined = process.env.EXPO_PUBLIC_WS_URL,
  apiUrl: string = API_URL,
): string {
  if (envWsUrl) {
    const trimmed = envWsUrl.replace(/\/$/, '');
    if (trimmed.includes('/ws/')) return trimmed;
    return `${trimmed}${DUEL_WS_PATH}`;
  }

  // Same origin as the REST calls: through the Metro proxy (/ws/* -> backend) and the Expo tunnel.
  const origin = apiUrl.match(/^(https?):\/\/([^/?#]+)/);
  if (!origin) return `ws://localhost:8081${DUEL_WS_PATH}`;
  return `${origin[1] === 'https' ? 'wss' : 'ws'}://${origin[2]}${DUEL_WS_PATH}`;
}

/** Maps a ClientMessage type to its Spring STOMP @MessageMapping destination. */
export function duelSendDestination(type: ClientMessage['type']): string {
  return `/app/duel/${type}`;
}

export type DuelSocketHandlers = {
  url: string;
  userId?: string;
  lang?: Lang;
  onOpen: (isReconnect: boolean) => void;
  onMessage: (message: ServerMessage) => void;
  onDisconnect: () => void;
  onError?: () => void;
};

export type DuelSocketClient = {
  send: (message: ClientMessage) => boolean;
  close: () => void;
};

/**
 * STOMP-over-WebSocket client with automatic reconnect (exponential backoff up to 5 s).
 * Sends `userId` and `lang` in STOMP CONNECT headers, subscribes to `/user/queue/duel`,
 * and publishes client messages to `/app/duel/<type>`. Stops reconnecting once `close()` is called.
 */
export function createDuelSocket(handlers: DuelSocketHandlers): DuelSocketClient {
  ensureTextEncoding();

  const userId = handlers.userId ?? USER_ID;
  const lang = handlers.lang ?? 'en';
  const isNative = Platform.OS !== 'web';

  let closedByCaller = false;
  let hasConnectedOnce = false;
  let subscription: StompSubscription | null = null;

  const client = new Client({
    brokerURL: handlers.url,
    connectHeaders: {
      userId,
      lang,
    },
    reconnectDelay: RECONNECT_BASE_MS,
    maxReconnectDelay: RECONNECT_MAX_MS,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    // React Native's native WebSocket can truncate text frames at STOMP's NULL terminator.
    forceBinaryWSFrames: isNative,
    appendMissingNULLonIncoming: isNative,
    onConnect: () => {
      if (closedByCaller) return;
      subscription = client.subscribe(DUEL_SUBSCRIBE_DESTINATION, (frame: IMessage) => {
        if (closedByCaller) return;
        try {
          const parsed = JSON.parse(frame.body) as ServerMessage;
          if (parsed && typeof parsed.type === 'string') {
            handlers.onMessage(parsed);
          }
        } catch {
          // Ignore malformed frames rather than crashing the match.
        }
      });
      const isReconnect = hasConnectedOnce;
      hasConnectedOnce = true;
      handlers.onOpen(isReconnect);
    },
    onWebSocketClose: () => {
      subscription = null;
      if (closedByCaller) return;
      handlers.onDisconnect();
    },
    onWebSocketError: () => {
      if (closedByCaller) return;
      handlers.onError?.();
    },
    onStompError: () => {
      if (closedByCaller) return;
      handlers.onError?.();
    },
  });

  client.activate();

  return {
    send(message: ClientMessage) {
      if (closedByCaller || !client.connected) return false;
      try {
        client.publish({
          destination: duelSendDestination(message.type),
          body: JSON.stringify(message),
          headers: { 'content-type': 'application/json' },
        });
        return true;
      } catch {
        return false;
      }
    },
    close() {
      if (closedByCaller) return;
      closedByCaller = true;
      if (subscription && client.connected) {
        try {
          subscription.unsubscribe();
        } catch {
          // Ignore unsubscribe errors on already-closing sockets.
        }
      }
      subscription = null;
      try {
        void client.deactivate();
      } catch {
        // Ignore deactivate errors on already-closing clients.
      }
    },
  };
}
