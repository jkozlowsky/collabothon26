import type { Categorization, FocusArea } from '@/types/categorization';
import type { Goal } from '@/types/onboarding';

/** `unchecked`: the user typed answers that Jev did not judge. `answered`: the questions they answered with text. */
type Summary = { categorization: Categorization; unchecked: boolean; answered: string[] };

// ponytail: module state, gone when the app restarts; the summary is a one-off screen after /categorizing.
let summary: Summary | null = null;

export const currentSummary = () => summary;
export const setSummary = (next: Summary | null) => {
  summary = next;
};

/** The focus area each onboarding goal belongs to (docs/specs/F1-profiling.md, "Goals → focus areas"). */
const GOAL_AREA: Record<Goal, FocusArea> = {
  budget: 'saving',
  'money-habits': 'saving',
  'banking-basics': 'saving',
  'start-saving': 'saving',
  'emergency-fund': 'saving',
  inflation: 'saving',
  'pay-off-debt': 'debt',
  'credit-cards': 'debt',
  'loans-mortgages': 'debt',
  'start-investing': 'investing',
  'stocks-etfs': 'investing',
  crypto: 'investing',
  retirement: 'retirement',
  insurance: 'risk',
  scams: 'risk',
};

export const goalAreas = (goals: Goal[]): FocusArea[] => goals.map((goal) => GOAL_AREA[goal]);
