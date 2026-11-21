import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { CATEGORIZATION_PATH } from '@/lib/categorization';
import { currentSummary, type Summary } from '@/lib/learningPath';
import type { Categorization } from '@/types/categorization';

/** The summary right after the test, else the stored row (a reload); undefined while loading, null when there is none. */
export function useSummary(): Summary | null | undefined {
  const [summary, setSummary] = useState<Summary | null | undefined>(() => currentSummary() ?? undefined);

  useEffect(() => {
    if (summary !== undefined) return;
    const ctrl = new AbortController();
    api<Categorization>(CATEGORIZATION_PATH, { signal: ctrl.signal }).then(
      (categorization) => setSummary({ categorization }),
      () => !ctrl.signal.aborted && setSummary(null),
    );
    return () => ctrl.abort();
  }, [summary]);

  return summary;
}
