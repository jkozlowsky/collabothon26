// Mirrors the lesson JSON in back/src/main/resources/content and LessonController.java.
// Shared contract between content, backend and player: change deliberately and tell the team.

export type LessonStatus = 'done' | 'available' | 'locked';

export type LessonSummary = {
  id: string;
  story: string;
  title: string;
  /** "Yeouido · office chat" */
  place: string;
  minutes: number;
  xp: number;
  status: LessonStatus;
};

type StepBase = {
  /** Unique within the lesson; variants and results refer to it. */
  id: string;
  /** Glossary keys this step trains; graded steps update the user's knowledge of them. */
  concepts?: string[];
};

/** Body texts may hold **bold** and [[concept]] / [[concept|shown text]] glossary links. */
export type TextStep = StepBase & { type: 'text'; kicker?: string; title?: string; body: string };

/** `me`: sent by the story's character, drawn on the right. */
export type ChatMessage = { from: string; text: string; me?: boolean };
export type ChatStep = StepBase & { type: 'chat'; title?: string; messages: ChatMessage[] };

export type QuizStep = StepBase & {
  type: 'quiz';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type MatchStep = StepBase & { type: 'match'; prompt?: string; pairs: [string, string][] };

export type SortStep = StepBase & {
  type: 'sort';
  prompt?: string;
  /** [left, right]: swiping left puts a card in bucket 0, right in bucket 1. */
  buckets: [string, string];
  items: { text: string; bucket: 0 | 1 }[];
  explanation?: string;
};

export type PredictStep = StepBase & {
  type: 'predict';
  prompt: string;
  input: { kind: 'slider'; min: number; max: number; step: number; unit: string };
  answer: number;
  reveal: string;
};

export type SliderModel = 'drawdownRecovery' | 'leverage' | 'oneCompanyCrash';

export type SliderParam = { label: string; min: number; max: number; step: number; value: number; unit?: string };

/** Goal is met when the value (`output` or a param key) lies within [min, max]. */
export type GoalCondition = { of: string; min?: number; max?: number };

export type SliderChartStep = StepBase & {
  type: 'slider-chart';
  prompt: string;
  model: SliderModel;
  params: Record<string, SliderParam>;
  output: { label: string; unit: string };
  goal: { condition: GoalCondition; hint: string };
  note?: string;
};

export type ScenarioChoice = { label: string; series: number[]; ending: string };
export type ScenarioStep = StepBase & {
  type: 'scenario';
  prompt: string;
  choices: ScenarioChoice[];
  unit: string;
  periodLabel: string;
};

/** "Your turn": {metric} placeholders are filled from the mock bank (lib/lessonMetrics.ts). */
export type ActionStep = StepBase & {
  type: 'action';
  title?: string;
  body: string;
  /** Shown when a metric in `body` has no data. */
  bodyNoData: string;
  /** Optional personal rule set with a slider, shown against an amount from the bank. */
  rule?: SliderParam & { appliesTo?: string; appliesToLabel?: string };
  cta?: string;
};

export type Step =
  | TextStep
  | ChatStep
  | QuizStep
  | MatchStep
  | SortStep
  | PredictStep
  | SliderChartStep
  | ScenarioStep
  | ActionStep;

export type StepType = Step['type'];

export type Lang = 'standard' | 'plain';

export type GlossaryEntry = { term: string; definition: string };

/** GET /api/lessons/{id}: variants already merged by the backend. */
export type Lesson = {
  id: string;
  story: string;
  title: string;
  place: string;
  minutes: number;
  xp: number;
  concepts: string[];
  steps: Step[];
  lang: Lang;
  /** 1-based position in the story, and the story's lesson count. */
  position: number;
  total: number;
  next: string | null;
  /** Definitions of every concept the lesson links to. */
  glossary: Record<string, GlossaryEntry>;
};

/** What a step reports when the user leaves it. */
export type StepOutcome = { correct?: boolean; choice?: number };

export type LessonResultRequest = {
  steps: { stepId: string; correctFirstTry: boolean }[];
  scenarioChoices: Record<string, number>;
  lang: Lang;
};

export type LessonResultResponse = { xpAwarded: number; firstCompletion: boolean; totalXp: number; next: string | null };
