import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { LessonPlayer } from '@/components/lesson/LessonPlayer';
import { colors } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { USER_ID } from '@/lib/user';
import type { Lang, Lesson, LessonResultRequest, LessonResultResponse } from '@/types/lessons';

const user = encodeURIComponent(USER_ID);

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lang, setLang] = useState<Lang>('standard');
  const { data, loading, error, reload } = useApi<Lesson>(`/api/lessons/${id}?lang=${lang}&userId=${user}`);

  // Keep showing the current lesson while its other language loads, so the player keeps its place.
  const [lesson, setLesson] = useState<Lesson>();
  if (data && data !== lesson) setLesson(data);
  // The other language failed to load: flip the toggle back to what is on screen.
  if (error && lesson && lesson.lang !== lang) setLang(lesson.lang);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/map'));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      {lesson ? (
        <LessonPlayer
          key={lesson.id}
          lesson={lesson}
          onTogglePlain={() => setLang(lesson.lang === 'plain' ? 'standard' : 'plain')}
          onClose={close}
          onNext={(next) => router.replace({ pathname: '/lesson/[id]', params: { id: next } })}
          onOpenGlossary={() => router.navigate('/glossary')}
          saveResult={(result: LessonResultRequest) =>
            api<LessonResultResponse>(`/api/lessons/${lesson.id}/result?userId=${user}`, {
              method: 'POST',
              body: JSON.stringify(result),
            })
          }
        />
      ) : (
        <AsyncContent loading={loading} error={error} onRetry={reload}>
          {() => null}
        </AsyncContent>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
});
