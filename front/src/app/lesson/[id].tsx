import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { LessonPlayer } from '@/components/lesson/LessonPlayer';
import { VideoLessonPlayer } from '@/components/video/VideoLessonPlayer';
import { colors } from '@/constants/theme';
import { localDate, useAccount } from '@/hooks/useAccount';
import { useApi } from '@/hooks/useApi';
import { useLessonSession } from '@/hooks/useLessonSession';
import { api } from '@/lib/api';
import { USER_ID } from '@/lib/user';
import type { Lesson, LessonMode, LessonResultRequest, LessonResultResponse } from '@/types/lessons';

const user = encodeURIComponent(USER_ID);

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Loaded once: both orders (classic steps, video beats) come in one response, so switching needs no reload.
  const { data: lesson, loading, error, reload } = useApi<Lesson>(`/api/lessons/${id}?userId=${user}`);

  return lesson ? (
    <LessonRun key={lesson.id} lesson={lesson} />
  ) : (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => null}
      </AsyncContent>
    </SafeAreaView>
  );
}

/** One run of a lesson, in the mode it opened in or the one the user switched to. */
function LessonRun({ lesson }: { lesson: Lesson }) {
  const { refreshStats } = useAccount();
  const saveResult = useCallback(
    async (result: LessonResultRequest) => {
      const saved = await api<LessonResultResponse>(`/api/lessons/${lesson.id}/result?userId=${user}`, {
        method: 'POST',
        body: JSON.stringify({ ...result, completedOn: localDate() }),
      });
      refreshStats();
      return saved;
    },
    [lesson.id, refreshStats],
  );
  // Fire and forget: if it fails, the lesson keeps the local mode.
  const rememberMode = useCallback((mode: LessonMode) => {
    api(`/api/users/${user}/lesson-mode`, { method: 'PUT', body: JSON.stringify({ mode }) }).catch(() => {});
  }, []);
  const session = useLessonSession(lesson, { saveResult, rememberMode });

  const close = () => (router.canGoBack() ? router.back() : router.replace('/map'));
  const nav = {
    onClose: close,
    onNext: (next: string) => router.replace({ pathname: '/lesson/[id]', params: { id: next } }),
    onOpenGlossary: () => router.navigate('/glossary'),
  };
  const video = session.progress.mode === 'video' && lesson.video ? { ...lesson, video: lesson.video } : null;

  return (
    // In video the dark player reaches under the status bar; it pads the top inset itself.
    <SafeAreaView style={styles.screen} edges={video ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      {video ? <VideoLessonPlayer lesson={video} session={session} {...nav} /> : <LessonPlayer lesson={lesson} session={session} {...nav} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
});
