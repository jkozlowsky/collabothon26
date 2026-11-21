import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { Button } from '@/components/Button';
import { FlowPage } from '@/components/categorizing/FlowPage';
import { PathSummary } from '@/components/categorizing/PathSummary';
import { continueToLearn } from '@/hooks/useOpenLearn';
import { currentSummary, markSeen } from '@/lib/learningPath';

/** What the onboarding and the Quick check found: the screen between the loading steps and the first lesson. */
export default function LearningPathScreen() {
  const summary = currentSummary();
  useEffect(() => {
    if (summary) markSeen(summary.categorization);
  }, [summary]);
  if (!summary) return <Redirect href="/map" />;

  const { categorization, answersSent } = summary;
  const start = categorization.startLesson;
  return (
    <FlowPage
      testID="learning-path"
      footer={
        <>
          <Button
            label={start ? `Start learning: ${start.title}` : 'Start learning'}
            onPress={() => continueToLearn(start?.lessonId)}
            testID="summary-start"
          />
          <Button label="See all lessons" variant="ghost" onPress={() => continueToLearn()} testID="summary-all" />
        </>
      }
    >
      <PathSummary categorization={categorization} answersSent={answersSent} />
    </FlowPage>
  );
}
