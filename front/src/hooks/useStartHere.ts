import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AREA_LABEL } from '@/constants/quickCheck';
import { api } from '@/lib/api';
import { CATEGORIZATION_PATH } from '@/lib/categorization';
import type { Categorization } from '@/types/categorization';

/** The stored categorisation, read again on every focus so "Start here" moves on after a lesson; null on a 404 or an error. */
export function useStartHere() {
  const [categorization, setCategorization] = useState<Categorization | null>(null);
  useFocusEffect(
    useCallback(() => {
      const ctrl = new AbortController();
      api<Categorization>(CATEGORIZATION_PATH, { signal: ctrl.signal }).then(
        setCategorization,
        () => !ctrl.signal.aborted && setCategorization(null),
      );
      return () => ctrl.abort();
    }, []),
  );
  return categorization?.startHere ? { startHere: categorization.startHere, why: whyHere(categorization) } : null;
}

/** The three "Why here" lines of the spec. */
function whyHere({ startHere, readyForNext, mastery }: Categorization) {
  if (readyForNext) return 'Why here: Next on your path';
  const area = AREA_LABEL[startHere!.area];
  return mastery[startHere!.area] == null ? `Why here: ${area} is not checked yet` : `Why here: Your answers about ${area}`;
}
