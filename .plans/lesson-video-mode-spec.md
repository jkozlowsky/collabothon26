# Lesson video mode

> Status: **spec after interview** (2026-11-21), not built.
> Look and flow come from the "Story mode" in [`concept/index.html`](../concept/index.html) (`Story`, `playerHTML`, `videoBeatHTML`, CSS under "Story mode: player / scenes / panel").
> Related: [`f4-f5-lessons-spec.md`](f4-f5-lessons-spec.md) (step types, variants, player rules), [`story-content-berlin-saopaulo-tokyo-spec.md`](story-content-berlin-saopaulo-tokyo-spec.md) (content rules), `front/src/types/lessons.ts` (the contract this spec changes).
> **Also in this spec:** the plain-language variant is removed from the whole app (§9).

## 1. Goal

Every lesson today is a stack of steps (chat, text, predict, slider, quiz…). This spec adds a **video form of the same lesson**: short animated scenes with narration and captions tell the story, and the lesson's hands-on steps appear in a panel under the player between scenes. The user can switch between video and the text form ("transcript") at any moment without losing their place.

| | Classic / transcript (exists) | Video (new) |
|---|---|---|
| Story told by | `chat` and `text` steps | 3–4 animated **scenes**, narrated, with captions |
| Hands-on part | all steps, full screen | **the same** steps, in a panel under the player |
| Result, XP, knowledge | `POST /result` | the same call, same XP, same step ids |
| Length | 3–4 min | 4–5 min |

Why it matters for the jury:
- **Engaging:** "watch, then decide" is the concept's strongest moment.
- **All generations:** watch or read, switchable at any point, remembered per user.
- **Technical / innovation:** scenes are **rendered live from lesson data**, not video files. So the ending follows the user's own `scenario` choice, and the last scene shows the user's own number from the mock bank.

## 2. Decisions

| Topic | Decision |
|---|---|
| What a "video" is | Animated illustrated scene built from lesson JSON, drawn with `react-native-svg` + `react-native-reanimated` (both installed). No video files, no `expo-video`. |
| Label | "Video". **No "AI video" / "AI scene" badge** as in the concept: the scenes are not AI-generated. |
| Steps | Video reuses the lesson's steps by id. Scenes replace the `chat` / `text` steps. One set of quizzes per lesson. |
| Choosing the mode | **No picker before the lesson.** The lesson opens in the user's **last used mode** (new users: video). A top-bar button switches mode **inside the lesson, both ways**, keeping progress (§5). |
| Switch look | A **transcript** button in video mode (opens the text form); a **watch** button in the same spot in classic mode. |
| Last used mode | Stored in the **backend user profile** (Flyway migration). |
| Branching | **Ending only:** a scene after a `scenario` step has one version per choice. |
| Layout | **Split, as in the concept:** dark player on top for the whole lesson, panel below. |
| Characters | Faceless flat silhouettes in the story colour. |
| Sound | **Narration** by one narrator voice, **ElevenLabs v4**, made by hand in the ElevenLabs UI and committed as files. Until a scene has its file it plays **silent** on hand-written timings. Sound on by default, mute button in the player. |
| Narration text | **Captions = narration.** One text per line; the captions are the transcript. |
| Personal scene | The last scene of a track shows the user's own number from the mock bank; the number is **shown, not spoken**. No data → the character's number with its own recorded line. |
| Skipping | **Skip scene** is always available. |
| Wrong answers | Same rule as Classic: a wrong graded step comes back at the end. Repeats carry over when the user switches mode. |
| Plain language | **Removed everywhere** (§9). Standard text only. |
| Demo scope | `seoul-1` (polished, personal last scene) and `seoul-2` (ending follows the choice). |
| Authoring | Dev-only **scene preview route** with a scrubber (§8). |
| Platforms | Web and Android. Animations only on `View` opacity/transform/width (§7.3). |

## 3. What the user sees

### 3.1 Starting a lesson

Nothing new on the story screen: **Start lesson** opens `/lesson/[id]` as now. The lesson opens in the user's last used mode if the lesson has a video track, otherwise in classic. Stops of lessons with video get a small film icon next to "4 min · +50 XP" so the user knows video exists.

### 3.2 Video mode

```
┌───────────────────────────────────┐
│ ▬▬▬▬ ▬▬▬▬ ▬▬── ──── ──── ────     │  beat segments: done / now / to do
│ ✕  Seoul · Lesson 1       🔈  ≣   │  close · titles · mute · transcript
│    The chat                       │
│                                   │
│        [ animated scene ]         │  player: always dark, ~38% of height
│                                   │
│   Her team chat says XYZ only     │  caption = what the narrator says now
│        goes up.                   │
│ ▶ ━━━━━━━━━━━━━━━──────── 0:07    │  play/pause · progress · time left
├───────────────────────────────────┤
│ SCENE 1 OF 4                      │  panel: app theme (light)
│ The chat                          │
│ Ji-woo has saved ₩10M. Her chat   │
│ is full of winners.               │
│ Your next move appears when the   │
│ scene ends.                       │
│ [         Skip scene            ] │
└───────────────────────────────────┘
```

**Player (top, fixed height for the whole lesson):**
- Height: `min(38% of screen, width × 0.8)`. Scene canvas 390 × 312, scaled to fill (`viewBox`, `xMidYMid slice`).
- Always dark (Design Kit dark surface), whatever the app theme. Gradient scrims top and bottom keep white controls readable. `StatusBar style="light"`.
- **Segments:** one per beat (scenes and steps), fixed count. `done` 95% white, `now` 62%, `to do` 28%. A repeated quiz at the end lights the last segment again; the panel says "Try again".
- **Title row:** close (`x`), "{City} · Lesson {n}" with the current scene title under it, **mute** (`volume-2` / `volume-x`), **transcript** (`file-text`, label "Transcript"). Close starts the lesson over next time (same rule as Classic).
- **Captions:** centred above the bottom bar, white on a 62% black pill, 15/600, max 2 lines. One caption at a time, synced to the narration.
- **Bottom bar:** play/pause (**Replay** after the scene ended), progress bar, time left.
- While a step is in the panel, the player shows the **last frame** of the scene before it: ambient loops (window lights, steam, breathing) keep running; camera and timed elements stay at their end state. Replay plays that scene again, with sound.

**Panel (bottom, scrolls):**
- **Scene beat:** eyebrow "Scene {n} of {m}", scene `title` (h2), `desc` (muted), hint "Your next move appears when the scene ends." (reduced motion: "Press play to watch, or skip ahead."), soft **Skip scene** button.
- When a scene ends, the panel moves to the next beat by itself, content staggered in as in the concept.
- **Step beat:** the existing step component in `compact` layout (§7.2). Feedback for graded steps uses the existing `Feedback` sheet.
- **End:** the existing `LessonEnd` screen with a ghost **Watch again** (replays the last scene).

### 3.3 Classic mode with a video track

The classic lesson as today, plus a **watch** button (`play-circle`, label "Watch") in `LessonTopBar` where the transcript button sits in video. Lessons without a video track show neither button.

### 3.4 Reduced motion and accessibility

- Reduced motion (`useReducedMotion()`): scenes don't autoplay; they wait on their first frame with Play. No camera moves; elements fade only. Narration plays when the user presses Play.
- Player = one accessible element: "Scene: {title}. {captions joined}". Play/pause/replay/mute/transcript are labelled buttons.
- On a beat change, focus moves to the panel heading.
- Every number a quiz depends on is also in a step or the panel `desc`, never only in a caption.

## 4. Content format

### 4.1 Lesson file

```jsonc
{
  "id": "seoul-1",
  "steps": [ /* unchanged: c1, t1, p1, s1, t2, q1, q2 — the classic order */ ],
  "video": {
    "minutes": 5,
    "scenes": [ /* scene objects, §4.2 */ ],
    "beats": ["v1", "p1", "v2", "s1", "v3", "q1", "q2", "v4"]
  },
  "variants": { /* level and persona only; no lang:plain */ }
}
```

- `steps` = the classic order. `beats` = the video order: scene ids and step ids.
- A step that is in both orders is a **shared step**. Steps only in `steps` (here `c1`, `t1`, `t2`) are the text that scenes replace.
- Scene ids start with `v` and never clash with step ids.

### 4.2 Scene

```jsonc
{
  "type": "scene",
  "id": "v2",
  "title": "Two weeks",
  "desc": "Watch what +40% and then −40% do to ₩10M.",
  "duration": 12,                       // seconds; used while the scene has no audio
  "audio": "seoul-1/v2.mp3",            // optional; under back/…/static/audio/
  "camera": "push",                     // push | pull | drift | none
  "setting": { "place": "office", "time": "night" },
  "layers": [
    { "kind": "character", "pose": "phone", "x": 0.28 },
    { "kind": "chart", "at": 1, "len": 7, "series": [10, 14, 8.4], "labels": ["Start", "Week 1", "Week 2"], "unit": "₩M" },
    { "kind": "amount", "at": 1, "len": 3, "from": 10000000, "to": 14000000, "currency": "KRW", "label": "Ji-woo's shares" },
    { "kind": "tag", "at": 3.5, "text": "+40%", "tone": "good", "x": 0.55, "y": 0.35 },
    { "kind": "amount", "at": 6, "len": 3, "from": 14000000, "to": 8400000, "currency": "KRW" },
    { "kind": "tag", "at": 8, "text": "−40%", "tone": "bad", "x": 0.78, "y": 0.62 }
  ],
  "captions": [
    { "at": 0.5, "text": "Week one: up 40%. ₩10M becomes ₩14M." },
    { "at": 5.5, "text": "Week two: down 40%, taken from ₩14M." },
    { "at": 9, "text": "She ends at ₩8.4M. Down 16%." }
  ]
}
```

`at` and `len` are seconds from scene start. A layer without `at` is there from frame one.

### 4.3 Shot kit

Six kinds, flat, in the story colour (`storyColors[story.color]`) on a dark palette. Every scene in every city uses only these.

| Kind | Fields | Draws | Motion |
|---|---|---|---|
| `setting` (scene field) | `place`: `office` \| `home` \| `street` \| `cafe`; `time`: `day` \| `dusk` \| `night` | Sky gradient by time; city skyline with the story's landmark (reuse `StoryLandmark`, kind from `stories.json`) through a window, or full width for `street`; wall and desk/table line. | Windows twinkle, stars at night. Loops. |
| `character` | `pose`: `sit` \| `stand` \| `phone`; `x` 0–1; `name?` | Faceless silhouette, round head, story tint. `phone` = holding a lit phone. | Breathing loop. |
| `phone` | `messages: [{ from, text, me?, at }]`, `x?` | Small phone with bubbles, `ChatStep` look. ≤ 4 messages, ≤ 40 chars. | Bubbles pop in at `at`; phone buzzes. Bubbles are **not narrated**. |
| `amount` | `from?`, `to`, `currency`, `label?`, `at`, `len`; or `metric` + `fallback` (§4.5) | Big number with label, formatted like the lesson (`₩14,000,000`). | Counts up/down over `len` s, ease-out; green rising, red falling. |
| `chart` | `series` (2–8), `labels?`, `unit`, `at`, `len` | Line chart in the lower half, dots on points. | Drawn left to right (a clipping `View` widens). |
| `tag` | `text` ≤ 10 chars, `tone`: `good` \| `bad` \| `neutral`, `x`, `y`, `at` | Pill chip: "+40%", "Day 31". | Pops in (scale 0.94 → 1, fade). |

**Camera** over the whole scene, ease-in-out: `push` 1 → 1.1, `pull` 1.12 → 1.02, `drift` small pan with ≤ 1° tilt, `none`. Off under reduced motion.

### 4.4 Ending that follows a choice

A scene after a `scenario` step may have `byChoice`:

```jsonc
{
  "type": "scene", "id": "v4", "title": "June", "duration": 10,
  "byChoice": {
    "step": "sc1",
    "0": { "layers": [ … ], "captions": [ … ], "audio": "seoul-2/v4-0.mp3" },
    "1": { "layers": [ … ], "captions": [ … ], "audio": "seoul-2/v4-1.mp3" },
    "2": { "layers": [ … ], "captions": [ … ], "audio": "seoul-2/v4-2.mp3" }
  }
}
```

The client merges the override for the user's choice onto the scene. An override may change `layers`, `captions`, `desc`, `camera`, `duration`, `audio`; nothing else. For `seoul-2`: all in with a loan / only ₩1M / skip, each with its own June scene. The rules of the story-content spec hold: an invested path shows its dip; endings show consequences, never what she "should" have done.

### 4.5 The personal scene

The last scene of `seoul-1` shows the user's own number:

```jsonc
{ "kind": "amount", "metric": "savingsBalance", "label": "Your savings account",
  "fallback": { "to": 10000000, "currency": "KRW", "label": "Ji-woo's savings" } }
```

- The value is filled on the device from the mock bank (`lib/lessonMetrics.ts`), so bank data never reaches the backend (same rule as `ActionStep`). The counter rolls up from 0.
- The narration never says the number: "This is your savings account today." … "A 50% fall would need +100% to get back."
- **No data:** the amount shows the `fallback` (Ji-woo's ₩10M), and the scene switches to its `noData` override: captions and audio about Ji-woo instead of "you".

```jsonc
"noData": { "captions": [ { "at": 0.5, "text": "Ji-woo's savings today." }, … ], "audio": "seoul-1/v4-nodata.mp3" }
```

### 4.6 Content rules

On top of the shared rules in the story-content spec §3:

- 3–4 scenes per track. A scene starts the track and a scene ends it. Silent `duration` 8–15 s, total ≤ 60 s.
- 2–4 captions per scene, ≥ 2.5 s apart, ≤ 70 characters (≤ 2 lines). Captions are exactly what the narrator says.
- Every **graded** step (`quiz`, `match`, `sort`) and every `scenario` and `action` step of the lesson is in `beats`. Only `chat` and `text` may be left out.
- Scenes hold no `[[links]]` and introduce no new concept; a step or the panel `desc` does that.
- No emoji, no brand names, no real people, no faces.

### 4.7 seoul-1 track

| Beat | What | Content |
|---|---|---|
| `v1` "The chat" · ~12 s | office · dusk, push | Ji-woo at her desk; bubbles from `c1` pop in ("XYZ is up 40% this week", "It doubles by June", "I'm putting my whole bonus in"); amount "Ji-woo's savings ₩10,000,000". Narration: "Ji-woo saved ₩10 million in three years." · "Her team chat says one stock only goes up." · "Before she decides: what does a big swing do to money?" |
| `p1` | predict | as Classic |
| `v2` "Two weeks" · ~12 s | office · night, drift | §4.2 |
| `s1` | slider-chart | as Classic |
| `v3` "The climb back" · ~10 s | street · night, pull | chart 10 → 5 → 10, tags "−50%", "+100% to get back". Narration: "Lose 10%, and you need 11% to get back." · "Lose half, and you need to double." · "The deeper the fall, the harder the climb." |
| `q1`, `q2` | quiz | as Classic |
| `v4` "Your numbers" · ~8 s | home · night, push | personal amount (§4.5), tag "−50% → +100%". Narration: "This is your savings account today." · "A 50% fall would need +100% to get back." No advice and no call to action. |

`seoul-2`: `v1` (Gangnam after work, chat from `c1`) → `t1`-replacing scene on 영끌 → `s1` → `sc1` → `v4` June with three endings (§4.4) → `q1`, `q2`. The exact storyboard is written with the content.

## 5. Switching modes

### 5.1 One state, two orders

The lesson screen holds one progress state over **step ids**, not positions:

```ts
type LessonProgress = {
  mode: LessonMode;
  /** Steps and scenes the user has left with Continue / that ended or were skipped. */
  done: Set<string>;
  firstTry: Record<string, boolean>;   // graded steps, first answer only
  choices: Record<string, number>;     // scenario choices
  repeats: string[];                   // graded steps answered wrong, still to redo, in order
  current: string;                     // id of the step or scene on screen
};
```

- Order of a mode: classic = `steps` ids, video = `beats`. The queue of a mode = its order, then `repeats`.
- `lib/lessonPlayer.ts` is rewritten on ids: `next(progress, order)` returns the first id in the order that isn't `done`, then the first of `repeats`, then "finished".

### 5.2 Where the other mode starts

On a switch, find **the first shared step that is not done** (in the target order).

- **Video → classic:** start exactly at that step. The `chat` / `text` steps before it are skipped: the scenes covered them.
- **Classic → video:** start at **the scene right before that step** in `beats` (if there is one and it wasn't watched), then the step. The user sees motion right after switching, and can skip it.
- **Every shared step done:**
  - to video: play the remaining scenes (e.g. the ending), then the repeats, then the end;
  - to classic: the remaining classic-only steps, then the repeats, then the end.
- **Mid-step:** an unanswered step on screen is not done; it shows again in the other mode. A step with its feedback already shown counts as done.
- **Mid-scene:** the scene counts as watched only if it ended or was skipped.
- **Repeats carry over:** a quiz answered wrong in video comes back at the end in classic, and the reverse.
- The switch is instant: both orders come in one response (§6.2), no reload.

### 5.3 Remembering the mode

- Every switch calls `PUT /api/users/{userId}/lesson-mode` with `{ mode }` (fire and forget; failure keeps the local mode).
- The value comes back in `GET /api/lessons/{id}` as `startMode`: the user's mode if the lesson has a video track, else `classic`. New users: `video`.
- The result request sends `mode` (the mode at the end) for the pitch metric "how many finish in video".

## 6. Contract changes

Shared contract: tell the team before merging.

### 6.1 Types (`front/src/types/lessons.ts`)

```ts
export type LessonMode = 'classic' | 'video';

export type LessonSummary = {
  // …existing fields
  /** Set when the lesson has a video track. */
  video: { minutes: number } | null;
};

export type SceneLayer =
  | { kind: 'character'; pose: 'sit' | 'stand' | 'phone'; x: number; name?: string }
  | { kind: 'phone'; messages: (ChatMessage & { at: number })[]; x?: number }
  | { kind: 'amount'; at?: number; len?: number; from?: number; to?: number; currency?: string; label?: string;
      metric?: string; fallback?: { to: number; currency: string; label: string } }
  | { kind: 'chart'; at?: number; len?: number; series: number[]; labels?: string[]; unit: string }
  | { kind: 'tag'; at?: number; text: string; tone: 'good' | 'bad' | 'neutral'; x: number; y: number };

type SceneFields = {
  title: string; desc: string; duration: number; audio?: string;
  camera: 'push' | 'pull' | 'drift' | 'none';
  setting: { place: 'office' | 'home' | 'street' | 'cafe'; time: 'day' | 'dusk' | 'night' };
  layers: SceneLayer[];
  captions: { at: number; text: string }[];
};
export type SceneOverride = Partial<Pick<SceneFields, 'layers' | 'captions' | 'desc' | 'camera' | 'duration' | 'audio'>>;

export type Scene = { id: string; type: 'scene' } & SceneFields & {
  byChoice?: { step: string } & Record<`${number}`, SceneOverride>;
  noData?: SceneOverride;
};

export type Lesson = {
  // …existing fields, minus `lang`
  /** Null when the lesson has no video track. */
  video: { minutes: number; scenes: Scene[]; beats: string[] } | null;
  startMode: LessonMode;
  color: StoryColor;
  landmark: { kind: LandmarkKind; at: number } | null;
  /** Base URL for scene audio, e.g. "/audio/". */
  audioBase: string;
};

export type LessonResultRequest = {
  steps: { stepId: string; correctFirstTry: boolean }[];
  scenarioChoices: Record<string, number>;
  mode: LessonMode;
};
```

`Lang` and `lang` are deleted (§9).

### 6.2 Backend

- `GET /api/lessons/{id}`: returns `steps` and `video` (scenes + beats) together, after level/persona variants are merged. Adds `startMode`, `color`, `landmark`, `audioBase`. The `lang` parameter is gone.
- `GET /api/stories`, `GET /api/lessons`: each summary gets `video: { minutes } | null`.
- `PUT /api/users/{userId}/lesson-mode` `{ mode: "classic" | "video" }` → 204. Stored on the user profile.
- Flyway: `V<n>__lesson_mode.sql` adds `preferred_lesson_mode varchar(8) not null default 'video'` with a check on the two values, to the user profile table; entity field to match (`ddl-auto=validate`).
- `POST /api/lessons/{id}/result`: drops `lang`, adds required `mode`. Step ids are lesson step ids as today; logged per result for the metric (no extra table needed if the results table gets a `mode` column in the same migration).
- Audio: `back/src/main/resources/static/audio/{lessonId}/{file}.mp3`, served by Spring's static handler at `/audio/…`. Check that CORS for the web build covers it.
- `LessonRules.validate` (fail fast at startup) for a lesson with `video`:
  - scene ids unique, not equal to any step id; every `beats` id exists; no id twice;
  - first and last beat are scenes; 3–4 scenes; `duration` 8–15, sum ≤ 60;
  - every `quiz`, `match`, `sort`, `scenario`, `action` step is in `beats`; only `chat` / `text` may be missing;
  - every `at` and `at + len` ≤ `duration`; captions sorted, ≥ 2.5 s apart, ≤ 70 chars;
  - known `kind`, `pose`, `place`, `time`, `camera`, `tone`;
  - `byChoice.step` is a `scenario` step before the scene in `beats`; keys are valid choice indices; overrides only touch the allowed fields;
  - `amount.metric` is in `KNOWN_METRICS` (mirror of `lessonMetrics.ts`) and has `fallback`; a scene with a metric amount has `noData`;
  - every `audio` path exists under `static/audio/` (a missing file fails startup, so a typo can't reach the demo).

### 6.3 Frontend files

| File | What |
|---|---|
| `app/lesson/[id].tsx` | loads the lesson once; owns `LessonProgress`; renders `VideoLessonPlayer` or `LessonPlayer` by `progress.mode`; calls the mode endpoint on switch |
| `lib/lessonPlayer.ts` | rewritten on ids (§5.1): `next`, `answer`, `switchMode`, `isFinished`, `resultRequest` |
| `components/lesson/LessonPlayer.tsx`, `LessonTopBar.tsx` | take progress from the screen; "Aa" toggle removed; **Watch** button when `lesson.video` |
| `components/video/VideoLessonPlayer.tsx` | player + panel |
| `components/video/ScenePlayer.tsx` | dark player: segments, title row, mute, transcript, captions, controls; owns the clock and the audio |
| `components/video/Scene.tsx` | draws a scene at clock `t` or `still` |
| `components/video/kit/*.tsx` | `Setting`, `Character`, `Phone`, `Amount`, `Chart`, `Tag` |
| `lib/sceneClock.ts` | pure: `captionAt`, `layerProgress`, `resolveScene(scene, choices, metric)` (applies `byChoice`, `noData`, fills the amount) |
| `components/steps/*` | `compact` prop via `StepLayout` |
| `app/story/[id].tsx` | film icon on stops with `video` |
| `app/dev/scene/[lessonId]/[sceneId].tsx` | preview route (§8) |
| `package.json` | `expo-audio` (via `npx expo install`) |

## 7. Implementation notes

### 7.1 Scene clock and audio

- **Without audio:** one Reanimated shared value `t`, `withTiming(duration, linear)` from the current `t` on play; `cancelAnimation` on pause.
- **With audio:** `expo-audio` `useAudioPlayer(audioBase + scene.audio)`. The scene's length is the file's duration. On play, start the player and `t` together; on pause, pause both; on each status update (~250 ms), if `|t − currentTime| > 0.15 s`, set `t` to `currentTime` and restart the timing. The audio is the master.
- Caption `at` values are hand-tuned to the recording (there is no timestamp export in the manual workflow); the preview route (§8) is how they are tuned.
- Kit elements derive their style from `t` in `useAnimatedStyle` (`interpolate`, clamped). No React render per frame.
- Caption index and time label: `useAnimatedReaction` on the caption index and `Math.floor(t)`, then `scheduleOnRN`.
- Scene end: `t >= length` (or the audio's `didJustFinish`) → `onEnded()` once. **Skip** stops the audio and sets `t = length`.
- Loops run on their own `withRepeat` values, so they continue on the end frame. `still` = `t` fixed at 0, no loops, no audio (dev preview gallery, the stop icon tooltip if ever needed).
- **Mute:** sets the player's volume to 0; the scene keeps its timing. Remembered on the device (AsyncStorage), not in the profile.
- **Web autoplay:** sound is allowed because the lesson starts from a tap. If `play()` is rejected anyway, the scene plays muted and the mute button shows muted.
- Audio is loaded when the scene's beat starts; the next scene's file is preloaded while a step is on screen.

### 7.2 Steps in the panel

- `StepLayout` gets `compact?: boolean`: panel padding only, title one size down, the action button in normal flow at the end.
- `chat` and `text` don't need `compact`: they are never in `beats`.
- `ScenarioStep` and `SliderChartStep` must fit a 360 × 520 dp panel (small Android phone). Check with the `break-ui` skill.

### 7.3 Web

- Animate only `opacity`, `transform` and `width` on `Animated.View`s that wrap static `Svg` parts. No animated SVG props (`strokeDashoffset`, `d`).
- Static `LinearGradient` in `Svg` is fine on both platforms.

### 7.4 Performance

- ≤ ~40 animated nodes per scene. Skyline windows: one static `Svg` plus 3 fading groups, not one node per window.
- One scene mounted at a time.

## 8. Authoring and narration workflow

1. Write the scene in the lesson JSON with `duration` and caption `at` values. It plays silent.
2. Check it at `/dev/scene/[lessonId]/[sceneId]` (dev builds only, `__DEV__`): the player at full size, a scrubber over `t`, ±0.1 s buttons, a choice picker for `byChoice` scenes, a "no data" switch for the personal scene, and the current `t` in seconds to copy into the JSON.
3. Narration, by hand: paste the scene's captions, one per line, into ElevenLabs (v4, the team's one narrator voice). Download the mp3, save it as `back/src/main/resources/static/audio/{lessonId}/{sceneId}.mp3` (`-0/-1/-2` for `byChoice`, `-nodata` for the personal fallback).
4. Add `"audio"` to the scene, restart the backend. In the preview, scrub to where each line starts and set the caption `at` values to match.
5. Any change to caption text needs a new recording. The validator can't catch text/audio drift; the preview is the check.

## 9. Removing plain language

Decided in the interview: standard text only, everywhere.

- **Content:** delete every `lang:plain` block from all lesson files. Keep `level:*` and `persona:*`.
- **Backend:** drop the `lang` parameter from `GET /api/lessons/{id}`, `lang` from the result request and from the response; drop the `lang:plain` key handling and its validator rules in `LessonRules`. If `lang` is stored in progress tables, a migration drops the column.
- **Frontend:** delete `Lang`, the "Aa" toggle in `LessonTopBar`, the `lang` state and the reload logic in `app/lesson/[id].tsx`.
- **Docs:** update `f4-f5-lessons-spec.md` §2 and the story-content spec §2 ("every lesson gets `lang:plain`") with a pointer here; update `FEATURES.md` if F5 lists plain language.
- **Tests:** remove the plain-language cases in `LessonControllerTests`, `lessons.test.tsx`.

This can land as its own PR before the video work; it touches the same files.

## 10. Design

- Figma is the source of truth. Before building, add frames next to the lesson frames: **Video · scene playing**, **Video · step in panel**, **Video · scene ended**, **Classic with Watch button**, **Stop with film icon**, and a **Shot kit** board (each layer kind, dark palette, per story colour). If the Figma MCP is rate-limited, read it through Chrome.
- Take from the concept: the player's proportions, segment bar, caption pills, scrims, the panel's staggered entry.
- Don't take: its colours and fonts (use Design Kit tokens and the story colour), the "AI" badges, "Chapter 1" naming (ours: "{City} · Lesson {n}"), the mode-choice sheet.
- Load `finance-quest-ui` before writing UI and `expo:expo-animation` for the clock and transitions.

## 11. Tests

**Backend:**
- `GET /api/lessons/seoul-1` returns `steps` in classic order, `video.beats` in video order, scenes, `startMode: "video"` for a new user, `color`, `landmark`, `audioBase`. `seoul-3` returns `video: null`, `startMode: "classic"`.
- `PUT lesson-mode` then `GET` → `startMode` follows; an invalid mode → 400.
- Summaries carry `video`.
- One invalid lesson per validator rule in §6.2 fails startup with a clear message (including a missing audio file).
- A result with only shared step ids and `mode: "video"` completes the lesson with the same XP as Classic.

**Frontend (Jest):**
- `lessonPlayer` on ids: video → classic mid-lesson starts at the next undone shared step and skips `chat`/`text`; classic → video starts at the scene before it; all shared done → trailing scenes/steps then repeats; a wrong quiz in video comes back at the end of classic; a step on screen without an answer shows again after a switch.
- `sceneClock`: caption at `t` (before first, between, after last); `layerProgress` clamps; `resolveScene` picks the `byChoice` override, fills the metric, and applies `noData` when the metric is missing.
- `VideoLessonPlayer`: Skip scene shows the next step; the end screen comes after the last scene; Transcript switches to classic at the right step.
- `LessonTopBar`: Watch shows only when `lesson.video`.

## 12. Order of work

1. **Plain-language removal** (§9), own PR.
2. Contract: types, `GET` with both orders, `startMode`, `lesson-mode` endpoint + migration, validator. `seoul-1` scenes with captions only (no layers).
3. `lessonPlayer` on ids + mode switching + `VideoLessonPlayer` / `ScenePlayer` with `setting` and `character`. **Cut line:** the demo shows video ⇄ transcript with captioned scenes.
4. `amount`, `chart`, `tag`, `phone`, camera; seoul-1 complete; personal scene; preview route.
5. Narration files for seoul-1 + `expo-audio` sync + mute.
6. `seoul-2` with `byChoice` endings and their recordings.

## 13. Open questions

1. **Narrator voice:** which ElevenLabs voice, and does the team have a plan/credits for ~15 short files (seoul-1: 4 + no-data; seoul-2: ~6)?
2. **Profile screen:** show the "Lessons open in: Video / Transcript" preference there too, or only switch inside lessons?
3. **Results `mode` column:** keep for the pitch metric, or drop if no one shows it?
