import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { ScenePreview } from '@/components/video/ScenePreview';
import { colors } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import type { Lesson } from '@/types/lessons';

/** Dev builds only: /dev/scene/seoul-1/v2 previews one scene to tune caption timings (lesson-video-mode-spec §8). */
export default function ScenePreviewScreen() {
  if (!__DEV__) return <Redirect href="/map" />;
  return <Preview />;
}

function Preview() {
  const { lessonId, sceneId } = useLocalSearchParams<{ lessonId: string; sceneId: string }>();
  // No user id: the lesson comes unlocked and unpersonalised.
  const { data, loading, error, reload } = useApi<Lesson>(`/api/lessons/${lessonId}`);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => data && <ScenePreview lesson={data} sceneId={sceneId} />}
      </AsyncContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
});
