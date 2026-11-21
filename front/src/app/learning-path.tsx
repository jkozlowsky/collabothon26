import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, BackHandler } from 'react-native';

import { Button } from '@/components/Button';
import { FlowPage } from '@/components/categorizing/FlowPage';
import { PathSummary } from '@/components/categorizing/PathSummary';
import { colors } from '@/constants/theme';
import { continueToLearn } from '@/hooks/useOpenLearn';
import { useSummary } from '@/hooks/useSummary';

export default function LearningPathScreen() {
  const summary = useSummary();
  const leaving = useRef(false);
  // A second tap would close the screen twice or push the lesson twice.
  const leave = useCallback((lessonId?: number) => {
    if (leaving.current) return;
    leaving.current = true;
    continueToLearn(lessonId);
  }, []);

  // Back must not leave the hand-off to the first lesson half done.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        leave();
        return true;
      });
      return () => sub.remove();
    }, [leave]),
  );

  if (summary === null) return <Redirect href="/map" />;
  if (summary === undefined) {
    return (
      <FlowPage testID="learning-path-loading" center>
        <ActivityIndicator color={colors.brandPrimary} accessibilityLabel="Loading your learning path" />
      </FlowPage>
    );
  }
  const { categorization } = summary;
  return (
    <FlowPage
      testID="learning-path"
      footer={
        <>
          <Button
            label="Start learning"
            onPress={() => leave(categorization.startLesson?.lessonId)}
            testID="summary-start"
          />
          <Button label="See all lessons" variant="ghost" onPress={() => leave()} testID="summary-all" />
        </>
      }
    >
      <PathSummary {...summary} />
    </FlowPage>
  );
}
