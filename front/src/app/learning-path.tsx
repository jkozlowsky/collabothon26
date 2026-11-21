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
  // A second tap would close the screen twice.
  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    continueToLearn();
  }, []);

  // Back leaves like the button.
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
  return (
    <FlowPage
      testID="learning-path"
      footer={<Button label="Show my path" onPress={leave} testID="summary-start" />}
    >
      <PathSummary {...summary} />
    </FlowPage>
  );
}
