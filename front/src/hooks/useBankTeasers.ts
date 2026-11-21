import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useApi } from '@/hooks/useApi';
import { useBank } from '@/hooks/useBank';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useOpenLearn } from '@/hooks/useOpenLearn';
import { NEWCOMER_HOME_STORY, newcomerTeaser, pickHomeStory, TEASER_STORY, teaserFor } from '@/lib/bank/teasers';
import { STORIES, withLessons } from '@/lib/stories';
import { USER_ID } from '@/lib/user';
import type { FqTeaser, FqTeaserPlacement } from '@/types/bank';
import type { LessonSummary } from '@/types/lessons';

/**
 * The bank's Atlas popups, from the same lesson list the Map uses, so their progress moves on
 * after a lesson. When the backend is down the local stories fill in. `ready`: the first load is over.
 * Before onboarding the popups start from the user's own bank numbers instead (newcomerTeaser).
 */
export function useBankTeasers(): { teasers: Record<FqTeaserPlacement, FqTeaser>; ready: boolean } {
  const { data: lessons, loading, reload } = useApi<LessonSummary[]>(`/api/lessons?userId=${encodeURIComponent(USER_ID)}`);
  useFocusEffect(reload);
  const { loaded: profileLoaded, done: onboarded } = useOnboarding();
  const { state, money } = useBank();
  // A focus reload passes through "loading" again: keep the last lessons, so the popup does not flicker
  // back to the local stories, and only the first load holds the popups back.
  const [last, setLast] = useState<LessonSummary[]>();
  const [loaded, setLoaded] = useState(false);
  if (lessons && lessons !== last) setLast(lessons);
  if (!loading && !loaded) setLoaded(true);
  const teasers = useMemo(() => {
    const stories = withLessons(STORIES, last);
    const byId = (id: string) => stories.find((s) => s.id === id) ?? stories[0];
    if (!onboarded) {
      return {
        home: newcomerTeaser('home', byId(NEWCOMER_HOME_STORY), state, money),
        credits: newcomerTeaser('credits', byId(TEASER_STORY.credits), state, money),
        invest: newcomerTeaser('invest', byId(TEASER_STORY.invest), state, money),
      };
    }
    return {
      home: teaserFor(pickHomeStory(stories)),
      credits: teaserFor(byId(TEASER_STORY.credits)),
      invest: teaserFor(byId(TEASER_STORY.invest)),
    };
  }, [last, onboarded, state, money]);
  // Wait for the profile too, so a returning user never sees the newcomer text first.
  return { teasers, ready: loaded && profileLoaded };
}

/** Opens a teaser's story page with its next lesson highlighted; onboarding first if it is not done. */
export function useOpenTeaser() {
  const open = useOpenLearn();
  return useCallback(
    (t: FqTeaser) => {
      const target = { pathname: '/story/[id]' as const, params: t.lessonId ? { id: t.storyId, lesson: t.lessonId } : { id: t.storyId } };
      // The story is a stack screen on top of the bank: push it, so Back returns to this tab.
      open(target, () => router.push(target));
    },
    [open],
  );
}
