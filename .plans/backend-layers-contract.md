# Backend refactor: repository → service → controller (JPA/Hibernate)

The binding contract for the two refactor workers (**O** = Claude Opus, **G** = agy). Branch `Sarnolek/backend-layers`, created from `Sarnolek/duel-v2`, shared worktree.

## 0. Goal

The whole backend (`back/`) follows a clean layered architecture with JPA/Hibernate instead of hand-written SQL through `JdbcClient` in controllers and services.

This is a **pure refactor**: the REST API (paths, params, JSON shapes, status codes) and the DB schema behaviour stay the same, the front keeps working unchanged, and the existing controller tests keep passing. Change their assertions only where the error body shape intentionally changes (§3).

Rule source: `/home/mchodulski/hackaton/Collabothon/collabothon26/spring-boot-best-practices/SKILL.md` and its `references/*.md`. Read all of it. It was written for another project (`ssbd01`), so §2 lists which rules apply here and how.

## 1. Package layout ("feature + layers")

```
com.collabothon.back
├── <feature>/controllers      @RestController, thin: validate → call service → ResponseEntity
├── <feature>/services         @Service, business logic + @Transactional
├── <feature>/repositories     Spring Data JpaRepository interfaces (+ content repositories reading JSON, §2.9)
├── entities/<feature>/        JPA @Entity classes and their enums
├── dto/<feature>/             request/response records (DTOs)
├── dto/converters/<feature>/  MapStruct @Mapper interfaces (generated only) + hand-written @Component mappers
├── exceptions/                BusinessException, ErrorCode, GlobalExceptionHandler
└── config/                    CorsConfig, ClockConfig, LoggingAspect, @ConfigurationProperties records
```

Features: `duel`, `xp`, `lesson`, `profile`, `glossary`. Pure domain helpers with no I/O (`LevelCurve`, `DuelTimerCalculator`, `DuelStepGrader`, `LessonRules`, `Streak`) go in `<feature>/services` as package-visible or public `@Component`s, or final utility classes, and keep their unit tests.

## 2. Rules (adapted from the best-practices doc)

1. **No `JdbcClient` / `JdbcTemplate` / hand-written SQL outside repositories.** Data access goes only through Spring Data repositories:
   - prefer derived queries and **closed interface projections** (`…Projection`, no DTO suffix);
   - write `@Query` (JPQL first, native only when JPQL cannot express it, e.g. `ON CONFLICT`, Postgres arrays) only for aggregates, joins or upserts;
   - never return unbounded lists where a page or a limit makes sense (the rankings top 50 → `Limit`/`Pageable`).
2. **Entities**:
   - every field gets `@Column(name = …, nullable = …, length = …)`;
   - Lombok `@Getter`, `@Setter` where needed, `@NoArgsConstructor(access = PROTECTED)`, and `@Builder` or a static factory;
   - **never** `@Data`, `@ToString` or `@EqualsAndHashCode`;
   - keep the existing key types (string user ids, `Long`/`String` ids; no `BaseEntity`/UUID: the schema stays);
   - composite keys via `@EmbeddedId` or `@IdClass`;
   - Postgres arrays via Hibernate's array mapping.
   Schema must match the migrations (`ddl-auto=validate`).
3. **Repositories**:
   - extend `JpaRepository<Entity, Id>` directly;
   - annotate the interface with `@Transactional(propagation = Propagation.MANDATORY)`, so every call needs a service transaction.
4. **Services**:
   - concrete `@Service` classes, no interface + `Impl`;
   - constructor injection via `@RequiredArgsConstructor`;
   - every public method has an explicit `@Transactional(readOnly = …, propagation = Propagation.REQUIRED)`. Single datasource, so no `transactionManager` attribute.
   - No `@Retryable` (no spring-retry here).
5. **Controllers**:
   - return `ResponseEntity<…>` everywhere;
   - `@Valid` on bodies, constraints on params;
   - no logic, no repository access.
   Keep the `/api/...` paths as they are: this project has no context-path, so do **not** move `/api` into config.
6. **DTOs**:
   - Java records in `dto/<feature>`;
   - entities never leave the service layer;
   - mapping via **MapStruct** interfaces with only generated methods (MapStruct and the lombok binding are already in `pom.xml`);
   - hand-written mapping in a `@Component` under `dto/converters/<feature>`;
   - our own enums in DTOs.
7. **Errors**: see §3.
8. **Java style**:
   - no inline fully-qualified names;
   - **no ternaries** in new or rewritten code;
   - `Objects.requireNonNullElse`;
   - guard clauses, nesting ≤ 3;
   - named constants for magic numbers;
   - never call the same getter twice in one expression.
9. **JSON content** (`content/lessons/*.json`, `content/duel/*.json`, `stories.json`, `glossary.json`) stays as files. Read them through `@Repository` classes in `<feature>/repositories` (e.g. `LessonContentRepository`, `DuelContentRepository`, `StoryRepository`), loaded and validated at startup as today. Services use them like any repository.
10. **Config**:
    - `@ConfigurationProperties` records in `config/` (or the feature, if it is used only there);
    - keep `application.properties` local: this project has no config-repo or Kustomize;
    - keep the injected `Clock`.
11. **Logging**: keep the existing `LoggingAspect` (moved to `config/`), adjusting its pointcuts to the new packages. Do not invent `@MethodCallLogged`.
12. **Not applicable here, ignore**: auth/JWT/`SecurityUtils`, `BaseEntity`, transaction-manager names, config-repo/Kustomize, OpenAPI annotations (springdoc is not a dependency), JaVers, and the auth-service clients.
13. **Migrations**: only **V17** may be edited (it is not on `main`), and only by **O**. Never edit V1–V16. **G** maps the existing tables as they are; if G truly needs a schema change, G uses `ask`.
14. **Tests**:
    - keep or port every existing test;
    - use test slices where they fit (`@WebMvcTest` with `@MockitoBean` services for controllers, `@DataJpaTest` + Testcontainers for repositories with custom queries);
    - keep the existing full-context integration tests for flows.
    - No `@DirtiesContext` unless unavoidable.

## 3. Errors (owned by O; G uses them)

```java
package com.collabothon.back.exceptions;

public interface ErrorCode {           // implemented by one enum per feature
    HttpStatus status();
    String message();                  // Polish user-facing message
}

public class BusinessException extends RuntimeException {
    public BusinessException(ErrorCode code) { … }
    public BusinessException(ErrorCode code, String detail) { … }   // detail appended for logs/debug
    public ErrorCode getCode() { … }
}
```

- One enum per feature, next to its services: `duel.services.DuelErrorCode`, `xp.services.XpErrorCode`, `lesson.services.LessonErrorCode`, `profile.services.ProfileErrorCode`, `glossary.services.GlossaryErrorCode`, plus `exceptions.CommonErrorCode` (`NOT_FOUND`, `BAD_REQUEST`) for generic cases.
- `GlobalExceptionHandler` (in `exceptions`) maps `BusinessException` to `ProblemDetail` with `status = code.status()`, `detail = code.message()`, and an extra property `code = <enum name>`. It keeps extending `ResponseEntityExceptionHandler` for validation and malformed JSON.
- `BadRequestException` and `NotFoundException` are **deleted**; every throw site uses `BusinessException`.
- **O creates this package first, as step 1** (before any other change), so G can use it.

## 4. Ownership

| Worker | Owns |
|---|---|
| **O** (Opus) | `exceptions/`, `config/` (incl. moving `common/` and `bank/ClockConfig` there), `BackApplication`, `application.properties`, V17, **duel**, **xp** (code, entities, DTOs, converters, tests), `BackApplicationTests`, the final pass over the whole module (§6) |
| **G** (agy) | **lesson**, **profile**, **glossary**: code, entities, DTOs, converters, repositories, tests |

Cross-feature APIs. Both sides use these exact names; O provides them early:

```java
com.collabothon.back.xp.services.XpService
    void awardLesson(String userId, String lessonId, String category, int xp, Instant at);   // idempotent
    int totalXp(String userId);
com.collabothon.back.lesson.repositories.StoryRepository   // owned by G; O's duel reads stories through it
    List<Story> findAll();            Optional<Story> findById(String id);
    // Story = record in dto/lesson or entities-like content record; G defines it, keeping the fields of stories.json incl. "category"
com.collabothon.back.lesson.repositories.LessonContentRepository   // owned by G; duel needs a lesson's title and story
    Optional<LessonContentProjection or record> findById(String lessonId);
com.collabothon.back.profile.repositories.AccountRepository        // owned by G; duel/xp read names and avatars
```

If either side needs another cross-feature method, it uses `ask`; the coordinator relays it.

## 5. Working in one shared worktree

- Both work in the same checkout, so a half-finished change breaks the other's compile. Refactor **one feature at a time in a single sweep**, and keep `./mvnw -q -o compile` green between sweeps.
- Run only your own test classes while working (`./mvnw -q test -Dtest='Duel*,Xp*'`, or `'Lesson*,Account*,UserProfile*,Glossary*'`). If a failure comes from the other worker's files, wait and retry; never edit their files.
- Never commit or push. Do not start the app stack, Metro, or the shared Postgres container; Testcontainers tests are fine.

## 6. Done

- G: its features done, its tests green, then `worker_done` with the file list.
- O: its features done; after G reports (the coordinator tells O), a final pass. Then `worker_done`.
  - Final pass: `grep -r "JdbcClient\|JdbcTemplate" back/src/main` is empty, there are no ternaries in touched code, and the package layout matches §1.
  - The full `./mvnw test` is green.
  - The app context starts with `ddl-auto=validate`.
- Report:
  - files moved or changed;
  - rules applied;
  - anything left on purpose, and why;
  - test summary.
