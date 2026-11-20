import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Backend base URL.
 * 1. EXPO_PUBLIC_API_URL from front/.env wins (e.g. a deployed backend).
 * 2. Otherwise: the Metro dev server that served the app (localhost, LAN or tunnel).
 *    metro.config.js proxies /api/* from there to the backend on localhost:8080,
 *    so the same URL works on web, emulator and a physical phone.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (Platform.OS === 'web') return window.location.origin;

  const metroHost = Constants.expoConfig?.hostUri;
  return metroHost ? `http://${metroHost}` : 'http://localhost:8081';
}

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status} ${res.statusText}: ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
