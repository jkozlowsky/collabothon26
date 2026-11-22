import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { SearchResponse } from '@/types/glossary';

const DEBOUNCE_MS = 250;

type Result = { q: string; data?: SearchResponse; error?: Error };

/**
 * Server-side search while typing. Waits for a short pause in typing, and a slow answer to an older
 * query can never replace a newer one. Keeps showing the previous results while the next ones load.
 */
export function useGlossarySearch(query: string) {
  const q = query.trim();
  const [debounced, setDebounced] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!debounced) return;
    let cancelled = false;
    // A slow answer to an older query is dropped, so it can never replace a newer one.
    const show = (result: Result) => {
      if (!cancelled) setResult(result);
    };
    api<SearchResponse>(`/api/glossary/search?q=${encodeURIComponent(debounced)}`).then(
      (data) => show({ q: debounced, data }),
      (error: Error) => show({ q: debounced, error }),
    );
    return () => {
      cancelled = true;
    };
  }, [debounced, attempt]);

  return {
    /** True while the search field has text (the screen then shows results instead of the category list). */
    active: q !== '',
    loading: q !== '' && result?.q !== q,
    data: result?.data,
    /** The query `data` belongs to, for highlighting (can lag behind the text field while typing). */
    resultQuery: result?.q ?? '',
    error: result?.q === q ? result.error : undefined,
    retry: () => setAttempt((a) => a + 1),
  };
}
