// Mirrors the lesson JSON in back/src/main/resources/content and LessonController.java.
// Shared contract between content, backend and player: change deliberately and tell the team.
// Video mode: .plans/lesson-video-mode-spec.md §4 and §6.1.
import type { LandmarkKind, StoryColor } from '@/types/stories';

export type LessonStatus = 'done' | 'available' | 'locked';

/** Video: animated scenes with steps in a panel. Classic: the text form, also called the transcript. */
export type LessonMode = 'classic' | 'video';

export type LessonSummary = {
  id: string;
  story: string;
  title: string;
  /** "Yeouido · office chat" */
  place: string;
  /** Short subject of the stop, "Hype and drawdowns"; null when the lesson has none. */
  topic: string | null;
  minutes: number;
  xp: number;
  status: LessonStatus;
  /** Set when the lesson has a video track. */
  video: { minutes: number } | null;
};

/**
 * Where a step sits in the lesson flow: the user learns, is challenged, sees their own situation, then
 * (when the lesson leads to one) decides. Optional; a lesson that uses it gives every step a phase, in this order.
 */
export type Phase = 'learn' | 'challenge' | 'you' | 'decide';

type StepBase = {
  phase?: Phase;
  /** Unique within the lesson; variants and results refer to it. */
  id: string;
  /** Glossary keys this step trains; graded steps update the user's knowledge of them. */
  concepts?: string[];
};

export type StatTone = 'good' | 'bad' | 'neutral';

/**
 * A hero number over a text step ("€1,825", "{savingsRate}"). The number in `value` counts up from `from`
 * (default 0); a value without a number (a missing bank metric's fallback words) just shows.
 */
export type Stat = { value: string; label: string; tone?: StatTone; from?: number };

/** Body texts may hold **bold** and [[concept]] / [[concept|shown text]] glossary links. */
/** One row of a "your situation" card: a fact from the user's accounts ({metric} placeholders), never a grade. */
export type Fact = { label: string; value: string; note?: string };

export type TextStep = StepBase & { type: 'text'; kicker?: string; title?: string; body: string; stat?: Stat; facts?: Fact[] };

/** `me`: sent by the story's character, drawn on the right. */
export type ChatMessage = { from: string; text: string; me?: boolean };
export type ChatStep = StepBase & { type: 'chat'; title?: string; messages: ChatMessage[] };

export type QuizStep = StepBase & {
  type: 'quiz';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** "Explain the chart": a line drawn above the options. `labels` name the points (years, shares). */
  chart?: { series: number[]; labels?: string[]; unit: string; caption?: string };
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

export type SliderModel =
  | 'drawdownRecovery'
  | 'leverage'
  | 'oneCompanyCrash'
  | 'realValue'
  | 'installmentCost'
  | 'countryMix'
  | 'monthlyPlan'
  | 'currencyMove'
  | 'compoundGrowth';

export type SliderParam = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  /** Start value from the user's bank (a number metric in lib/lessonMetrics.ts); `value` when there is no data. */
  fromBank?: string;
};

/** Goal is met when the value (`output` or a param key) lies within [min, max]. */
export type GoalCondition = { of: string; min?: number; max?: number };

/**
 * A picture next to the chart. `basket`: what €100 buys, items fading as buying power falls (realValue).
 * `split`: the value split into money paid in and growth (compoundGrowth, monthlyPlan).
 */
export type SliderVisual = 'basket' | 'split';

export type SliderChartStep = StepBase & {
  type: 'slider-chart';
  prompt: string;
  model: SliderModel;
  visual?: SliderVisual;
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
  rule?: SliderParam & {
    appliesTo?: string;
    appliesToLabel?: string;
    /** `share` (default): the value is a percent of the amount. `multiple`: the amount times the value (3 months × spending). */
    kind?: 'share' | 'multiple';
    /** Line under the slider; {amount} is the computed amount. Default: "= at most {amount} {appliesToLabel} on one bet". */
    result?: string;
    /** With `kind: 'multiple'`: an amount (AMOUNTS key) drawn against the rule as months covered, e.g. the savings. */
    compareTo?: string;
  };
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

export type CameraMove = 'push' | 'pull' | 'drift' | 'none';
export type ScenePlace = 'office' | 'home' | 'street' | 'cafe';
export type SceneTime = 'day' | 'dusk' | 'night';
export type TagTone = 'good' | 'bad' | 'neutral';

/** The shot kit: every scene in every city is drawn from these. `at` / `len` are seconds from scene start. */
export type SceneLayer =
  | { kind: 'character'; pose: 'sit' | 'stand' | 'phone'; x: number; name?: string }
  | { kind: 'phone'; messages: (ChatMessage & { at: number })[]; x?: number }
  | {
      kind: 'amount';
      at?: number;
      len?: number;
      from?: number;
      to?: number;
      currency?: string;
      label?: string;
      /** Filled on the device from the mock bank (lib/lessonMetrics.ts AMOUNTS); `fallback` when there is no data. */
      metric?: string;
      fallback?: { to: number; currency: string; label: string };
    }
  | { kind: 'chart'; at?: number; len?: number; series: number[]; labels?: string[]; unit: string }
  | { kind: 'tag'; at?: number; text: string; tone: TagTone; x: number; y: number };

export type SceneCaption = { at: number; text: string };

type SceneFields = {
  title: string;
  desc: string;
  /** Seconds; the scene's length while it has no audio. */
  duration: number;
  /** Narration file, relative to the lesson's `audioBase`. */
  audio?: string;
  camera: CameraMove;
  setting: { place: ScenePlace; time: SceneTime };
  layers: SceneLayer[];
  /** Captions = narration, one line at a time. */
  captions: SceneCaption[];
};

export type SceneOverride = Partial<Pick<SceneFields, 'layers' | 'captions' | 'desc' | 'camera' | 'duration' | 'audio'>>;

export type Scene = { id: string; type: 'scene' } & SceneFields & {
    /** The ending that follows a scenario choice; keys are choice indices. */
    byChoice?: { step: string } & Record<`${number}`, SceneOverride>;
    /** Applied when a metric amount has no data (the character's number instead of the user's). */
    noData?: SceneOverride;
    /** Id of the text step that is this scene's transcript in classic mode; it contains every caption word for word. */
    transcript?: string;
  };

export type VideoTrack = {
  minutes: number;
  scenes: Scene[];
  /** The video order: scene ids and step ids. */
  beats: string[];
};

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
  /** The classic order. */
  steps: Step[];
  /** Null when the lesson has no video track. */
  video: VideoTrack | null;
  /** The user's last used mode if the lesson has a video track, else classic. */
  startMode: LessonMode;
  /** The story's city, for the player title "Seoul · Lesson 1". */
  city: string;
  color: StoryColor;
  landmark: { kind: LandmarkKind; at: number } | null;
  /** Base URL for scene audio, e.g. "/audio/". */
  audioBase: string;
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
  /** The mode the lesson was finished in. */
  mode: LessonMode;
};

export type LessonResultResponse = { xpAwarded: number; firstCompletion: boolean; totalXp: number; next: string | null };
