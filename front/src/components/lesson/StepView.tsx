import { useMemo } from 'react';

import { PhaseContext } from '@/components/lesson/StepLayout';
import { ActionStep } from '@/components/steps/ActionStep';
import { ChatStep } from '@/components/steps/ChatStep';
import { MatchStep } from '@/components/steps/MatchStep';
import { PredictStep } from '@/components/steps/PredictStep';
import { QuizStep } from '@/components/steps/QuizStep';
import { ScenarioStep } from '@/components/steps/ScenarioStep';
import { SliderChartStep } from '@/components/steps/SliderChartStep';
import { SortStep } from '@/components/steps/SortStep';
import { TextStep } from '@/components/steps/TextStep';
import { useBank } from '@/hooks/useBank';
import { personalizeStep } from '@/lib/lessonMetrics';
import type { Step, StepOutcome } from '@/types/lessons';

type Props = { step: Step; retry: boolean; onDone: (outcome: StepOutcome) => void };

/** One lesson step by type, with the user's bank numbers filled in; the same components play in classic and in the video panel. */
export function StepView({ step: raw, retry, onDone }: Props) {
  const { state, money } = useBank();
  const step = useMemo(() => personalizeStep(raw, state, money), [raw, state, money]);
  return <PhaseContext.Provider value={step.phase}>{renderStep(step, retry, onDone)}</PhaseContext.Provider>;
}

function renderStep(step: Step, retry: boolean, onDone: (outcome: StepOutcome) => void) {
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
    default:
      // Unknown step types are skipped (backend validation should prevent them).
      return null;
  }
}
