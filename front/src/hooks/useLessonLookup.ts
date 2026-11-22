import { useCallback } from 'react';

import { useApi } from '@/hooks/useApi';
import { useCurrentUser } from '@/lib/user';
import type { LessonStatus } from '@/types/lessons';
import type { StoryPage } from '@/types/stories';

export type LessonPlace = {
  status: LessonStatus;
  city: string;
  /** 1-based position in the story. */
  stop: number;
  stops: number;
};

/** Where a lesson sits in its story and whether it is open yet, from the same stories feed as the map. */
export function useLessonLookup(): (story: string, lessonId: string) => LessonPlace | null {
  const { userId } = useCurrentUser();
  const { data } = useApi<StoryPage[]>(`/api/stories?userId=${encodeURIComponent(userId)}`);
  return useCallback(
    (story, lessonId) => {
      const page = data?.find((s) => s.id === story);
      const index = page?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
      if (!page || index < 0) return null;
      return { status: page.lessons[index].status, city: page.city, stop: index + 1, stops: page.lessons.length };
    },
    [data]
  );
}
