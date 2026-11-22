# Jev integration: over-engineering review

Scope: `back/.../categorization/**`, `front/src/hooks/useQuickCheck.ts`, `front/src/types/categorization.ts`,
`front/src/test-utils/categorization.ts` and their tests, reviewed at `origin/main` c65aeb4.
Line numbers refer to that commit.

## Findings

### JevClient

- services/JevClient.java:L207-234,L327-397: shrink: `parseStep` and `parse` each parse a lesson choice through `lessonsByLabel` + `choice(..., Map)`, and `parse` has a second `choice(..., E[])` overload plus `gapLabels()` to build the same kind of map. One `choice(answer, options, labelFn)` that builds the label map with `Collectors.toMap(labelFn, identity())`, plus `lessonId(answer, lessons)` for both lesson picks; deletes `lessonsByLabel`, `gapLabels` and the enum overload.
- services/JevClient.java:L333-342: shrink: `parse` fills `noul` (EnumMap) and `focus` (wire-keyed LinkedHashMap) side by side with the same values. Keep `noul`, pass `QuickCheckRules.byWire(noul)`, same keys in the same order.
- services/JevClient.java:L332,L343-345: shrink: `role` is parsed before the focus loop but null-checked after it. Check it right after parsing; every path returns `Optional.empty()` either way.
- services/JevClient.java:L299-301: yagni: `gapKey(area)` wraps `"gap_" + area.wire()` while `"mastery_" + area.wire()` is inline next to it. Inline it, so all three prefixes read the same way.
- enums/FocusArea.java:L35-37: yagni: `jevQuestion()` (`"focus_" + wire()`), one caller in `JevClient.parse`. Inline it there, next to the other question-key prefixes.

### Mappers that copy a record

- mappers/CheckLessonMapper.java:L1-16: delete: a MapStruct bean injected into 3 services (and built by hand in tests) to copy 5 fields of `CheckQuestion` into `CheckLesson`. `CheckQuestion.lesson()`, 3 lines.
- services/QuickCheckRules.java:L266-270: shrink: `lessons(questions, Function toLesson)` dedupes through a `LinkedHashMap` keyed by lesson id. `questions.stream().map(CheckQuestion::lesson).distinct().toList()`: questions of one lesson give equal records, `distinct` keeps first-seen order.
- mappers/JevAnswerMapper.java:L1-20: delete: five `@Mapping` lines and an `expression` to flatten `Answer` into `JevAnswerDto`. `Answer.toJev()`, one constructor call, 3 lines.
- mappers/StartLessonMapper.java:L1-21: delete: three identity `@Mapping`s plus two renames for one caller. `new StartLessonDto(lessonId, title, area, story.id(), story.city())` in `CategorizationService.startLesson`.
- services/CategorizationService.java:L67-71, services/QuickCheckService.java:L38-40: delete: the mapper fields and imports that the three deletions above leave unused.

### Rules

- services/QuickCheckRules.java:L62-74: yagni: `meanPerArea(areas, answers, ToDoubleFunction)` exists for one caller with one function (`Answer::score`). Inline it into `mastery`.
- services/QuickCheckRules.java:L302-305,L359-360: yagni: `stories(candidates, stories)` has one caller, which then copies it into an `ArrayList` after `start` and filters `start` back out. `Stream.concat(Stream.of(start), candidates.stream().flatMap(l -> storyOf(l.id(), stories).stream())).map(Story::id).distinct().toList()`.
- services/CheckQuestionService.java:L54-58: shrink: label list materialised only to compare its distinct count. `lessons.stream().map(CheckLesson::label).distinct().count() != lessons.size()`.
- services/CheckQuestionService.java:L62-66: stdlib: `strings()` loops into an `ArrayList` and copies it. `array.valueStream().map(JsonNode::asString).toList()`.
- enums/WireNames.java:L12-17: delete: `fromWire(Class, String)` has no caller (`Experience` and `LifeStage` have their own). Nothing replaces it.

### Frontend

- front/src/hooks/useQuickCheck.ts:L16-26,L179-189: shrink: `QuestionView` redeclares and copies `area`, `prompt`, `options` and `correctIndex` from `CheckQuestion`. `Pick<CheckQuestion, 'area' | 'prompt' | 'options' | 'correctIndex'> & { key; why; result }` and `{ ...question, key, why, result }`.
- front/src/hooks/useQuickCheck.ts:L29,L52,L151,L191: delete: stage `first` behaves exactly like `waiting` (same status line, same staleness check, same position; `step` reads "first" from `history.length`). `begin` sets `waiting`.
- front/src/hooks/useQuickCheck.ts:L198, components/categorizing/QuickCheckPage.tsx:L17,L27,L48,L60,L62, app/categorizing.tsx:L173: yagni: `total` is the constant `MAX_QUESTIONS`, threaded hook → screen → page → question as a prop. `QuickCheckPage` imports `MAX_QUESTIONS`.

net: -110 lines possible.

## Checked and kept

- `step` vs `ask` in `JevClient`: they share `post`, the label/probability checks and (after the shrink above) the choice parsing. What is left differs on purpose: `step` runs on a 3 s `Future` and reports elapsed time, `ask` tracks `sent` through the `NOT_SENT` cause chain. Merging them would need flags for both.
- Hand-built `state` maps: a record per call with `@JsonInclude(NON_NULL)` on `facts`/`answers` would serialise the same, but it is two new files (no nested types) for ~10 lines of `put`s. Longer, so kept. The question text blocks parsed to `ObjectNode` are already the "one place" for wording; records would be longer and harder to diff against the specs the tests pin.
- `JevConsts`, `CategorizationConsts`, `FactsConsts`: every constant has at least one reader besides its declaration and the house style keeps meaningful values in consts classes. Ports, schemes and loopback hosts back the startup validation.
- `JevProperties`, `JevHttpClientConfig`, `NOT_SENT`, the 3xx guard, the step timeout executor, `MODEL_ID`: team decisions (no retries, no SDK, privacy flag, redirects never success).
- `CheckQuestionMapper`, `OnboardingAnswersMapper`: API/projection mappings, outside the Jev path, kept as MapStruct.
- `QuickCheckRules.checkedJevGap`: one-line filter with one caller, but it is pinned by five unit tests that document the Jev-vs-rule rule. Inlining saves 4 lines and loses that seam.
- Duplicate `@AssertTrue` consent checks in `StepRequestDto` and `CategorizationRequestDto`: a shared interface would be its own file and save nothing.
- `types/categorization.ts`, `test-utils/categorization.ts`: contract types and one fixture factory. Lean already.

## Skipped

- (none of the findings above change the API contract, the DB schema, the Jev payload or test-observable behaviour, so all were applied)

## Out of scope (noticed, not fixed)

- `JevClient.step` does not check `properties.callsJev()`; only `QuickCheckService` does. A future caller of `step` without that guard would send a keyless request to the hosted API and get 401s on every step.
- `JevClient.step`: after a `TimeoutException` the request has most likely already left, but the step response does not say so; the front counts it in `stepCallsMade` only because it increments before sending. The "sent" accounting for step calls lives entirely on the client.
