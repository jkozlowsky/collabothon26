import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, BackHandler } from 'react-native';

import { PathSummary } from '@/components/categorizing/PathSummary';
import { preloadGlobe } from '@/components/globe/Globe';
import { Page } from '@/components/onboarding/Page';
import { BigButton } from '@/components/onboarding/ui';
import { colors } from '@/constants/theme';
import { continueToLearn } from '@/hooks/useOpenLearn';
import { useSummary } from '@/hooks/useSummary';

export default function LearningPathScreen() {
  const summary = useSummary();
  const leaving = useRef(false);
  // The Map comes next (also when the app reloads here): load the globe while the user reads.
  useEffect(preloadGlobe, []);
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
      <Page testID="learning-path-loading" center>
        <ActivityIndicator color={colors.brandPrimary} accessibilityLabel="Loading your learning path" />
      </Page>
    );
  }
  return (
    <Page
      testID="learning-path"
      center
      footer={<BigButton label="Show my path" onPress={leave} testID="summary-start" />}
    >
      <PathSummary {...summary} />
    </Page>
  );
}
