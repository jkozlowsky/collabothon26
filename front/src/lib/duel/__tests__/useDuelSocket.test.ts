import { act, renderHook } from '@testing-library/react-native';

import { duelSocketUrl, reconnectDelay, useDuelSocket } from '@/lib/duel/useDuelSocket';
import type { DuelSocketMessage } from '@/types/duel';

class MockSocket {
  static instances: MockSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    MockSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(message: DuelSocketMessage) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}

const realWebSocket = global.WebSocket;

beforeEach(() => {
  jest.useFakeTimers();
  MockSocket.instances = [];
  (global as unknown as { WebSocket: unknown }).WebSocket = MockSocket;
});

afterEach(() => {
  jest.useRealTimers();
  global.WebSocket = realWebSocket;
});

describe('duelSocketUrl', () => {
  it('maps http to ws and https to wss and carries the account and device', async () => {
    expect(duelSocketUrl('http://localhost:8081', 'demo-user', 'dev 1')).toBe(
      'ws://localhost:8081/ws/duel?userId=demo-user&deviceId=dev%201',
    );
    expect(duelSocketUrl('https://api.example.com/', 'demo-elena', 'd')).toBe(
      'wss://api.example.com/ws/duel?userId=demo-elena&deviceId=d',
    );
  });
});

describe('reconnectDelay', () => {
  it('backs off 1 s, 2 s, 4 s and caps at 8 s', async () => {
    expect([0, 1, 2, 3, 9].map(reconnectDelay)).toEqual([1000, 2000, 4000, 8000, 8000]);
  });
});

describe('useDuelSocket', () => {
  it('stays idle without a device id or while disabled', async () => {
    await renderHook(() => useDuelSocket({ userId: 'demo-user', deviceId: null, enabled: true, onMessage: jest.fn() }));
    await renderHook(() => useDuelSocket({ userId: 'demo-user', deviceId: 'd', enabled: false, onMessage: jest.fn() }));
    expect(MockSocket.instances).toHaveLength(0);
  });

  it('connects, delivers parsed messages and sends only while open', async () => {
    const onMessage = jest.fn();
    const { result } = await renderHook(() =>
      useDuelSocket({ userId: 'demo-user', deviceId: 'dev-1', enabled: true, onMessage }),
    );
    const socket = MockSocket.instances[0];
    expect(socket.url).toContain('/ws/duel?userId=demo-user&deviceId=dev-1');
    expect(result.current.status).toBe('connecting');
    expect(result.current.send({ type: 'cancel' })).toBe(false);

    await act(async () => socket.open());
    expect(result.current.status).toBe('open');
    expect(result.current.send({ type: 'queue', categories: ['berlin'] })).toBe(true);
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'queue', categories: ['berlin'] });

    await act(async () => socket.receive({ type: 'queued', timeoutMs: 15000 }));
    expect(onMessage).toHaveBeenCalledWith({ type: 'queued', timeoutMs: 15000 });
  });

  it('reconnects with backoff after the socket drops', async () => {
    const { result } = await renderHook(() =>
      useDuelSocket({ userId: 'demo-user', deviceId: 'dev-1', enabled: true, onMessage: jest.fn() }),
    );
    await act(async () => MockSocket.instances[0].open());
    await act(async () => MockSocket.instances[0].drop());
    expect(result.current.status).toBe('closed');
    expect(MockSocket.instances).toHaveLength(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(MockSocket.instances).toHaveLength(2);

    await act(async () => MockSocket.instances[1].drop());
    await act(async () => {
      jest.advanceTimersByTime(1999);
    });
    expect(MockSocket.instances).toHaveLength(2);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(MockSocket.instances).toHaveLength(3);
  });

  it('waitForOpen resolves true when the socket opens and false on timeout', async () => {
    const { result } = await renderHook(() =>
      useDuelSocket({ userId: 'demo-user', deviceId: 'dev-1', enabled: true, onMessage: jest.fn() }),
    );
    const opened = result.current.waitForOpen(3000);
    await act(async () => MockSocket.instances[0].open());
    await expect(opened).resolves.toBe(true);

    const { result: second } = await renderHook(() =>
      useDuelSocket({ userId: 'demo-user', deviceId: 'dev-2', enabled: true, onMessage: jest.fn() }),
    );
    const timedOut = second.current.waitForOpen(3000);
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await expect(timedOut).resolves.toBe(false);
  });

  it('closes the socket on unmount without reconnecting', async () => {
    const { unmount } = await renderHook(() =>
      useDuelSocket({ userId: 'demo-user', deviceId: 'dev-1', enabled: true, onMessage: jest.fn() }),
    );
    await act(async () => MockSocket.instances[0].open());
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(20_000);
    });
    expect(MockSocket.instances).toHaveLength(1);
    expect(MockSocket.instances[0].readyState).toBe(3);
  });
});
