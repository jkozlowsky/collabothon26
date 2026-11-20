// Backend base URL. Override with EXPO_PUBLIC_API_URL in front/.env
// (on a physical phone use your machine's LAN IP, not localhost).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}: ${path}`);
  }
  return res.json() as Promise<T>;
}
