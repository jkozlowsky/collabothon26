import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlossarySheet } from '@/components/lesson/GlossarySheet';
import { LessonEnd } from '@/components/lesson/LessonEnd';
import { LessonTopBar } from '@/components/lesson/LessonTopBar';
import { ConceptLinkContext } from '@/components/lesson/RichText';
import { StepView } from '@/components/lesson/StepView';
import type { LessonSession } from '@/hooks/useLessonSession';
import { isRetry, progressShare, weakConcepts } from '@/lib/lessonPlayer';
import type { Lesson } from '@/types/lessons';

type Props = {
  lesson: Lesson;
  session: LessonSession;
  onClose: () => void;
  onNext: (lessonId: string) => void;
  onOpenGlossary: () => void;
};

/**
 * Classic form of a lesson (the transcript of the video form): one step at a time, missed graded steps again
 * at the end, then the end screen. Progress lives in the session, so switching to video keeps the place.
 */
export function LessonPlayer({ lesson, session, onClose, onNext, onOpenGlossary }: Props) {
  const { progress, xp, complete, switchTo } = session;
  const [concept, setConcept] = useState<string | null>(null);
  const step = progress.current === null ? undefined : lesson.steps.find((s) => s.id === progress.current);
  const weak = weakConcepts(progress, lesson.steps, lesson.concepts);

  return (
    <ConceptLinkContext.Provider value={setConcept}>
      <View style={styles.fill}>
        <LessonTopBar
          progress={progressShare(progress, lesson)}
          onWatch={lesson.video && step ? () => switchTo('video') : undefined}
          onClose={onClose}
        />
        {step ? (
          // Keyed by turn: a repeated step mounts fresh (reset, reshuffled).
          <View key={`${step.id}-${progress.turn}`} style={styles.fill}>
            <StepView step={step} retry={isRetry(progress)} onDone={(outcome) => complete(step.id, outcome)} />
          </View>
        ) : (
          <LessonEnd
            title={lesson.title}
            xp={xp}
            concepts={lesson.concepts.map((key) => ({ key, term: lesson.glossary[key]?.term ?? key, weak: weak.has(key) }))}
            onConcept={setConcept}
            onNext={lesson.next ? () => onNext(lesson.next!) : undefined}
            onClose={onClose}
          />
        )}
        <GlossarySheet
          entry={concept ? lesson.glossary[concept] : undefined}
          onClose={() => setConcept(null)}
          onMore={() => {
            setConcept(null);
            onOpenGlossary();
          }}
        />
      </View>
    </ConceptLinkContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
