import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlossarySheet } from '@/components/lesson/GlossarySheet';
import { LessonEnd } from '@/components/lesson/LessonEnd';
import { LessonTopBar } from '@/components/lesson/LessonTopBar';
import { ConceptLinkContext } from '@/components/lesson/RichText';
import { ActionStep } from '@/components/steps/ActionStep';
import { ChatStep } from '@/components/steps/ChatStep';
import { MatchStep } from '@/components/steps/MatchStep';
import { PredictStep } from '@/components/steps/PredictStep';
import { QuizStep } from '@/components/steps/QuizStep';
import { ScenarioStep } from '@/components/steps/ScenarioStep';
import { SliderChartStep } from '@/components/steps/SliderChartStep';
import { SortStep } from '@/components/steps/SortStep';
import { TextStep } from '@/components/steps/TextStep';
import { advance, isFinished, isRetry, resultRequest, startPlayer, weakConcepts } from '@/lib/lessonPlayer';
import type { Lesson, LessonResultRequest, LessonResultResponse, Step, StepOutcome, StepType } from '@/types/lessons';

type Props = {
  lesson: Lesson;
  onTogglePlain: () => void;
  onClose: () => void;
  onNext: (lessonId: string) => void;
  onOpenGlossary: () => void;
  saveResult: (result: LessonResultRequest) => Promise<LessonResultResponse>;
};

const KNOWN: ReadonlySet<StepType> = new Set([
  'text',
  'chat',
  'quiz',
  'match',
  'sort',
  'predict',
  'slider-chart',
  'scenario',
  'action',
]);

/**
 * Plays a lesson: one step at a time, missed graded steps again at the end, then the end screen. The lesson
 * may be swapped for its plain-language version mid-way; steps keep their ids, so the position stays.
 */
export function LessonPlayer({ lesson, onTogglePlain, onClose, onNext, onOpenGlossary, saveResult }: Props) {
  // Unknown step types are skipped (backend validation should prevent them).
  const steps = lesson.steps.filter((s) => KNOWN.has(s.type));
  const [state, setState] = useState(() => startPlayer(steps));
  const [concept, setConcept] = useState<string | null>(null);
  const [xp, setXp] = useState<number | null | 'error'>(null);
  const finished = isFinished(state);

  function onDone(outcome: StepOutcome) {
    const next = advance(state, steps, outcome);
    setState(next);
    if (isFinished(next)) {
      saveResult(resultRequest(next, lesson.lang)).then(
        (r) => setXp(r.xpAwarded),
        () => setXp('error'),
      );
    }
  }

  const step = finished ? null : steps[state.queue[state.pos]];
  const weak = weakConcepts(state, steps, lesson.concepts);

  return (
    <ConceptLinkContext.Provider value={setConcept}>
      <View style={styles.fill}>
        <LessonTopBar
          progress={state.pos / state.queue.length}
          plain={lesson.lang === 'plain'}
          showLangToggle={!finished}
          onTogglePlain={onTogglePlain}
          onClose={onClose}
        />
        {step ? (
          // Keyed by position: a repeated step mounts fresh (reset, reshuffled).
          <View key={`${step.id}-${state.pos}`} style={styles.fill}>
            {renderStep(step, isRetry(state), onDone)}
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

function renderStep(step: Step, retry: boolean, onDone: (o: StepOutcome) => void) {
  switch (step.type) {
    case 'text':
      return <TextStep step={step} onDone={onDone} />;
    case 'chat':
      return <ChatStep step={step} onDone={onDone} />;
    case 'quiz':
      return <QuizStep step={step} onDone={onDone} />;
    case 'match':
      return <MatchStep step={step} onDone={onDone} />;
    case 'sort':
      return <SortStep step={step} retry={retry} onDone={onDone} />;
    case 'predict':
      return <PredictStep step={step} onDone={onDone} />;
    case 'slider-chart':
      return <SliderChartStep step={step} onDone={onDone} />;
    case 'scenario':
      return <ScenarioStep step={step} onDone={onDone} />;
    case 'action':
      return <ActionStep step={step} onDone={onDone} />;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
