import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { categorizationPath } from '@/lib/categorization';
import { currentSummary, type Summary } from '@/lib/learningPath';
import { useCurrentUser } from '@/lib/user';
import type { Categorization } from '@/types/categorization';

/** The summary right after the test, else the stored row (a reload); undefined while loading, null when there is none. */
export function useSummary(): Summary | null | undefined {
  const { userId } = useCurrentUser();
  const [summary, setSummary] = useState<Summary | null | undefined>(() => currentSummary() ?? undefined);

  useEffect(() => {
    if (summary !== undefined) return;
    const ctrl = new AbortController();
    api<Categorization>(categorizationPath(userId), { signal: ctrl.signal }).then(
      (categorization) => setSummary({ categorization }),
      () => !ctrl.signal.aborted && setSummary(null),
    );
    return () => ctrl.abort();
  }, [summary, userId]);

  return summary;
}
