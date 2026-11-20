import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';

type Result<T> = { key: string; data?: T; error?: Error };

/** Minimal data-fetching hook: GET on mount / path change, `reload()` to retry. */
export function useApi<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T>>();
  const key = `${path}#${attempt}`;

  useEffect(() => {
    let cancelled = false;
    api<T>(path).then(
      (data) => !cancelled && setResult({ key, data }),
      (error: Error) => !cancelled && setResult({ key, error }),
    );
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const current = result?.key === key ? result : undefined;
  return { data: current?.data, error: current?.error, loading: !current, reload };
}
