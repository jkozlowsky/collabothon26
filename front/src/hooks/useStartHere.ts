import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { api } from '@/lib/api';
import { categorizationPath } from '@/lib/categorization';
import { useCurrentUser } from '@/lib/user';
import type { Categorization } from '@/types/categorization';

/** The stored categorisation, read again on every focus so "Start here" moves on after a lesson; null on a 404 or an error. */
export function useStartHere() {
  const { userId } = useCurrentUser();
  const [categorization, setCategorization] = useState<Categorization | null>(null);
  useFocusEffect(
    useCallback(() => {
      const ctrl = new AbortController();
      api<Categorization>(categorizationPath(userId), { signal: ctrl.signal }).then(
        setCategorization,
        () => !ctrl.signal.aborted && setCategorization(null),
      );
      return () => ctrl.abort();
    }, [userId]),
  );
  return categorization?.startHere ? { storyId: categorization.startHere.storyId, why: 'Based on your onboarding answers' } : null;
}
