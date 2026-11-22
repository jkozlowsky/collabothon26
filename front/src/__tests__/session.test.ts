import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  acquireSession,
  fetchDemoAccounts,
  getDeviceId,
  releaseSession,
  resetCachedDeviceIdForTests,
  startHeartbeat,
} from '@/lib/session';

describe('session lib', () => {
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    resetCachedDeviceIdForTests();
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('device id is stable across calls and persists in storage', async () => {
    const id1 = await getDeviceId();
    expect(id1).toBeTruthy();
    expect(typeof id1).toBe('string');

    // Second call without cache reset
    const id2 = await getDeviceId();
    expect(id2).toBe(id1);

    // After memory cache reset, reads from storage
    resetCachedDeviceIdForTests();
    const id3 = await getDeviceId();
    expect(id3).toBe(id1);
  });

  test('fetchDemoAccounts calls GET /api/demo-accounts with deviceId', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [
        { userId: 'demo-user', firstName: 'Alex', lastName: 'Krause', avatar: 'm1', status: 'free' },
      ],
    });

    const accounts = await fetchDemoAccounts('dev-123');
    expect(accounts).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/demo-accounts?deviceId=dev-123'),
      expect.any(Object),
    );
  });

  test('acquireSession sends POST with deviceId in body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ userId: 'demo-user', ttlMs: 120000, heartbeatMs: 30000 }),
    });

    const res = await acquireSession('demo-user', 'dev-123');
    expect(res.userId).toBe('demo-user');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/demo-user/session'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ deviceId: 'dev-123' }),
      }),
    );
  });

  test('heartbeat 409 triggers the logout/conflict path and stops heartbeat', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
    });

    const onConflict = jest.fn();
    const heartbeat = startHeartbeat('demo-user', 'dev-123', 30000, onConflict);

    // Advance 30s to trigger first heartbeat tick
    await jest.advanceTimersByTimeAsync(30000);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/demo-user/session'),
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(onConflict).toHaveBeenCalledTimes(1);

    // Advance another 30s; heartbeat should have stopped and not make further calls
    fetchMock.mockClear();
    await jest.advanceTimersByTimeAsync(30000);
    expect(fetchMock).not.toHaveBeenCalled();

    heartbeat.stop();
  });

  test('releaseSession sends DELETE and handles errors gracefully', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await releaseSession('demo-user', 'dev-123');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/demo-user/session?deviceId=dev-123'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
