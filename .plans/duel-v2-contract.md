# Duel v2: implementation contract

The binding contract between the three duel v2 workers. It refines `.plans/duel-improvements-spec.md`; where the two differ, **this file wins** (it already includes the spec's §0 "Round 3 changes"). Change it only through the coordinator.

## 1. Ownership (who edits what)

| Worker | Owns | Must not edit |
|---|---|---|
| **A: backend** | `back/**` except `back/src/main/resources/content/duel/**` | `front/**` |
| **B: duel screens** | `front/src/types/duel.ts`, `front/src/lib/duel/**`, `front/src/app/(main)/(learn)/duel.tsx`, `front/src/app/duel/**`, `front/src/components/duel/**` except `components/duel/questions/**`, their tests in `front/src/__tests__/` | `back/**`, `components/duel/questions/**`, `components/steps/**`, `components/globe/**` |
| **C: content + questions + globe** | `back/src/main/resources/content/duel/**`, `front/src/components/duel/questions/**`, `front/src/components/steps/**` (only additive, see §6), `front/src/components/globe/**`, `front/src/app/(main)/(learn)/map.tsx`, `front/src/lib/models.ts` (additive), their tests | everything else |

The types in §3 are written by B into `front/src/types/duel.ts`. C imports from there. Until B's file has them, C may declare the same types locally in `components/duel/questions/types.ts` and switch to the import at the end.

## 2. Domain rules (summary; details are in the spec)

- **Category = story id** from `back/src/main/resources/content/stories.json` (`seoul`, `berlin`, `sao-paulo`, `tokyo`). A adds a PL field `"category"` to each story: Seoul „Hype i dźwignia”, Berlin „Inflacja i oszczędności”, São Paulo „Raty i długi”, Tokyo „Dywersyfikacja”.
- **Modes**: `HUMAN` (simulated rival) and `SOLO` (0 XP). No bots, no Elo.
- **Questions**: 6 per match. Content comes from `content/duel/<story>.json`. **Demo rule**: whatever categories are ticked, the match uses the 6 fixed questions of `berlin.json` in file order, with no option shuffle. Each question keeps its own `category` (`berlin`).
- **XP**: 5 per correct answer in HUMAN, credited to the question's category, written when the player has answered all 6 (before the rival finishes). One `xp_event` row per (match, category) with xp > 0.
- **Rival**: a random `demo-*` account. It answers question k 1–4 s after the player's answer or timeout on k. Its correctness keeps `r = max(p−1, 0)` (spec §5.1), so the final score is the player's minus 1, and 0:0 when the player scores 0.
- **Timer**: `timeLimitMs` from the JSON, or the formula in spec §6. The server sets `deadline`.
- **Polish only**: no `lang` param anywhere in the duel.

## 3. REST API (all JSON, `userId` as in v1, no auth)

```ts
type DuelMode = 'HUMAN' | 'SOLO';
type StoryColor = 'rose' | 'violet' | 'orange' | 'teal' | 'slate';

/** GET /api/duel/categories?userId= — lobby list, stories.json order. */
type DuelCategory = {
  story: string;            // "berlin"
  name: string;             // "Inflacja i oszczędności" (full, never truncated in UI)
  icon: string;             // Feather icon name from stories.json
  color: StoryColor;
  xp: number; level: number; xpIntoLevel: number; xpForLevel: number;
};

type PlayerCard = {
  name: string;             // first name from account
  avatar: 'm1'|'m2'|'m3'|'f1'|'f2'|'f3';
  levels: Record<string, number>;   // story id → level; UI shows the level of the current question's category
};

/** Question as sent before answering: answer fields removed (see §4). */
type DuelQuestion = {
  index: number;            // 0..5
  category: string;         // story id of this question
  step: DuelStep;
  deadline: number;         // epoch ms
  timeLimitMs: number;
};

type DuelAnswer =
  | { option: number }      // quiz: index in the options as sent
  | { value: number }       // predict, chart
  | { mistakes: number };   // sort, match (graded on the client, like lessons)

/** POST /api/duel/matches */
type StartMatchRequest = { userId: string; categories: string[]; mode: DuelMode };   // categories: 1..4 story ids
type RivalSnapshot = { answered: number; results: (boolean | null)[] };              // length 6
type MatchStart = {
  matchId: number; mode: DuelMode; categories: string[];
  you: PlayerCard; rival: PlayerCard | null;   // null in SOLO
  questionCount: number; question: DuelQuestion;
};

/** POST /api/duel/matches/{id}/answers — body: { userId, index } & DuelAnswer. A late answer counts as timeout. Idempotent per index. */
type AnswerResult = {
  index: number; correct: boolean; timedOut: boolean;
  nextQuestion: DuelQuestion | null;
  rivalProgress: RivalSnapshot | null;
  yourFinal: { score: number; xpGained: number } | null;   // set once all 6 are answered
  finished: boolean;                                       // match settled (rival done too)
};

/** GET /api/duel/matches/{id}/state?userId= — polling (every ~1 s on the waiting screen) and resume after reload. */
type MatchState = {
  matchId: number; mode: DuelMode; categories: string[];
  you: PlayerCard; rival: PlayerCard | null;
  questionCount: number;
  yourResults: (boolean | null)[];
  question: DuelQuestion | null;      // null once you answered all
  rivalProgress: RivalSnapshot | null;
  yourFinal: { score: number; xpGained: number } | null;
  finished: boolean;
};

type MatchOutcome = 'WIN' | 'DRAW' | 'LOSS' | 'SOLO';

type ReviewItem = {
  index: number;
  category: string;
  step: Step;               // full lesson-format step incl. answer fields (quiz.correctIndex/explanation, predict.answer/tolerance/reveal, …)
  yourAnswer: DuelAnswer | null;      // null = timed out
  correct: boolean;
  lessonId: string;         // → /lesson/[id]
  lessonTitle: string;
};

/** GET /api/duel/matches/{id}?userId= — result + review; marks the match seen. 409 while not finished. */
type MatchEnd = {
  matchId: number; mode: DuelMode; categories: string[];
  outcome: MatchOutcome; score: number; rivalScore: number | null;
  you: PlayerCard; rival: PlayerCard | null;
  xpGained: number; xpByCategory: Record<string, number>;
  review: ReviewItem[];     // in question order; the UI puts wrong ones first
};

/** GET /api/duel/matches?userId= — "Historia" tab: unfinished first, then finished newest first, max 50. */
type MatchSummary = {
  matchId: number; mode: DuelMode; categories: string[];
  rival: PlayerCard | null;
  status: 'PLAYING' | 'RIVAL_PLAYING' | 'FINISHED';   // PLAYING = you have not answered all yet
  seen: boolean;
  score: number; rivalScore: number | null;           // rivalScore null until FINISHED
  outcome: MatchOutcome | null;
  xpGained: number;
  startedAt: string;        // ISO
};

/** GET /api/duel/rankings?userId= — weekly overall only (ISO week, Europe/Warsaw). */
type RankingRow = { rank: number; userId: string; name: string; avatar: PlayerCard['avatar']; level: number; weeklyXp: number };
type Rankings = { top: RankingRow[]; me: RankingRow | null };   // top 50; level = level of the user's total XP

/** GET /api/xp/{userId}/categories — shared with lessons/profile. */
type CategoryXp = { category: string; xp: number; level: number; xpIntoLevel: number; xpForLevel: number; weeklyXp: number };
```

Errors: `400` for a bad request (unknown category, empty categories, wrong answer shape), `404` for an unknown match, `409` for a result requested before it is finished. Use the existing `GlobalExceptionHandler` and `BadRequestException`/`NotFoundException`.

## 4. Steps in the duel

`Step` = the lesson step union from `front/src/types/lessons.ts`, plus one duel-only type:

```ts
/** Duel-only: a chart drawn from a lesson model with fixed params; the player answers one number with a slider. */
type ChartStep = {
  type: 'chart'; id: string;
  prompt: string;
  model: SliderModel;                       // same models as slider-chart (front/src/lib/models.ts)
  params: Record<string, SliderParam>;      // fixed values; not editable in the duel
  output: { label: string; unit: string };
  input: { kind: 'slider'; min: number; max: number; step: number; unit: string };
  answer: number; tolerance: number;
  explanation: string;
};
```

Also, in the duel `predict` carries `tolerance: number`, and `quiz`, `predict`, `sort` and `match` may carry `explanation` (shown in review).

`DuelStep` (sent before answering) = `Step | ChartStep` with these fields removed: `quiz.correctIndex`, `quiz.explanation`, `predict.answer`, `predict.reveal`, `predict.tolerance`, `chart.answer`, `chart.tolerance`, `chart.explanation`, `*.explanation`. `sort` and `match` are sent whole (they are graded on the client by mistake count).

Allowed duel types: `quiz`, `predict`, `chart`, `sort`, `match`.

## 5. Content file `back/src/main/resources/content/duel/<story>.json` (written by C, loaded and validated by A)

```jsonc
{
  "story": "berlin",
  "questions": [
    { "id": "berlin-d1", "lessonId": "berlin-1", "timeLimitMs": null,
      "step": { "type": "quiz", "id": "d1", "prompt": "…", "options": ["…","…","…","…"], "correctIndex": 1, "explanation": "…" } }
  ]
}
```

A validates at startup, the same way `LessonRules.validate` does, and fails fast with a message naming the file and question:
- the type is allowed;
- `lessonId` exists and belongs to the same story;
- quiz has 2–4 options and a valid `correctIndex`;
- predict and chart have `tolerance > 0` and an answer inside the input range;
- chart uses a known model;
- sort has ≥ 2 items;
- match has ≥ 2 pairs;
- ids are unique.

## 6. Front question component (C), used by B

```tsx
// front/src/components/duel/questions/DuelQuestionView.tsx
type Props = {
  question: DuelQuestion;
  /** Called once, when the player commits; disable input afterwards. */
  onSubmit: (answer: DuelAnswer) => void;
  disabled?: boolean;     // after submit or when time is up
};
export function DuelQuestionView(props: Props): JSX.Element;
```

- quiz: tap an option and it submits.
- predict and chart: a slider plus a yellow „Zatwierdź” button.
- sort and match: they finish when everything is placed or matched, then submit `{ mistakes }`.
- The view shows no explanation and no hints; B's screen shows the short right/wrong banner.

Changes to `components/steps/*` must be **additive**: an optional prop, or extracting a shared piece. Lessons must behave exactly as before, and their tests must stay green.

## 7. Done means

- `cd back && ./mvnw test` green (A).
- `cd front && npx tsc --noEmit && npx expo lint && npm test` green (B, C).
- No running app stack, Metro or Playwright: the coordinator runs one shared QA stack at the end.
- Nothing committed or pushed.
