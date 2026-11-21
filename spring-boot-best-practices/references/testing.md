# Spring Boot Testing Best Practices

Advanced testing in Spring Boot requires a pragmatic, layered approach. Follow these rules to ensure fast, reliable, and maintainable test suites.

## 1. The Test Pyramid (70/20/10 Rule)
* **Unit Tests (~70%):** Write fast unit tests without loading the Spring application context. Mock dependencies using plain Mockito.
* **Integration/Slice Tests (~20%):** Test specific layers (e.g., repository layer with `@DataJpaTest` or web layer with `@WebMvcTest`).
* **E2E/System Tests (~10%):** Use `@SpringBootTest` only for full end-to-end tests where the entire application context is required.

### Test Organization
* Tests must be organized by type inside each module's test folder. Create subdirectories for `unit`, `integration`, `e2e`, and `bdd` (e.g., `src/test/java/.../mok/unit` and `src/test/java/.../mok/integration`) to cleanly separate test scopes.

## 2. Test Setup & Helpers
* **Base Configurations:** Always check how tests are configured in the project. For integration tests, extend the existing base configuration classes rather than manually configuring test contexts from scratch. In `utils.config`:
  * `TestDataSetup` loads the CSV datasets;
  * it builds on `BaseTestSetup`, which in turn builds on `TestContainersSetupInit`.
* **Helper Functions:** Utilize existing helper functions (e.g., in `utils.functions` such as `RequestFunctions`) to keep your tests concise and avoid duplicating setup logic.
* **Test Data:** The project maintains test data in CSV files under `src/test/resources/datasets/`. Use these existing datasets for populating the database during tests. Rows reference each other by id (`report_match.csv` → `report_comparison.csv` → `report.csv`), so don't drop a row another file depends on.
* **Database access in integration tests:** use the test repositories in `utils/repositories/` (e.g. `SubjectTestRepository`, `RepositoryTagTestRepository`). They run on the admin entity manager and extend `JpaRepository<T, UUID>` **directly**, with no shared base interface.
  * Production `mpp` repositories are `Propagation.MANDATORY`, so don't call them from tests or wrap them in a `TransactionTemplate`.
  * If a test repository is missing, add one. Don't delete test repositories to make code compile.

## 2a. Authentication in Tests
* **Integration tests** send real JWTs, signed with the test secret from `src/test/resources/application.properties`.
  * `BaseTestSetup` provides ready-made headers: `teacherHeaders`, `otherTeacherHeaders`, `studentHeaders`, `otherStudentHeaders`, `adminHeaders`, plus single `Header` variants.
  * For a custom user, use `JwtTestUtils.generateToken(UUID userId, List.of(AccountConsts.ROLE_TEACHER))`.
  * User ids live in `TestConsts` and must match the `teacher_id` / student ids in the CSV datasets.
* **Unit tests** extend `UnitTestSetup` and call `mockAuthenticatedUser(TestConsts.TEACHER_ID, AccountConsts.ROLE_TEACHER)` in `@BeforeEach`. Services read the user through `SecurityUtils.getCurrentUserId()`, so no `Principal` or login is passed in.
* For per-subject permissions, cover both sides: an assigned role that is allowed, and an unassigned or insufficient role (`VIEWER`) that gets `SUBJECT_ACCESS_DENIED` / 403.

## 3. Match the project's existing test styles
* **Integration tests** in this project are **full-context `@SpringBootTest(webEnvironment = RANDOM_PORT)` + RestAssured**, driven through the shared base classes `BaseTestSetup` / `TestContainersSetupInit` (`utils.config`). New integration tests must extend those — do **not** hand-roll a context or switch them to slices.
* **Unit tests** load no Spring context: plain Mockito + AssertJ (see §1).
  * `@ExtendWith(MockitoExtension.class)` uses strict stubs, so an unused `when(...)` fails the test with `UnnecessaryStubbingException`. Stub only what the code path calls, and use `lenient()` only when you really must.
  * `@InjectMocks` passes `null` for any constructor dependency without a `@Mock`. Mock everything the tested path touches, e.g. `ReportStatisticsMathService` for report generation.
* Test slices (`@WebMvcTest`, `@DataJpaTest`, `@JsonTest`) are acceptable only for genuinely new, isolated layer tests where no suitable base class exists; keep them consistent with the module's `unit` / `integration` folder split.

## 4. Testcontainers for Integration Tests
* Do not mock your database in integration tests. Rely on the project's base Testcontainers setup to test against real infrastructure.
* Only Docker is required. A `.env` file is read if present, but the defaults work without it.

## 5. Mocking Strategy
* **Spring Boot 3.4+:** Use `@MockitoBean` instead of the deprecated `@MockBean` for better AOT compilation support.
* **Avoid Over-Mocking:** If you find yourself mocking every internal dependency, it's a code smell. Consider if an integration test is more appropriate or if your class has too many responsibilities.
* Use `@MockitoSpyBean` to spy on real beans when you need partial mocking.

## 6. Assertions
* **Use AssertJ:** Always use AssertJ (`assertThat(...)`) for writing fluent, readable assertions instead of JUnit's built-in `assertEquals`.

## 7. Reliability and Performance
* **Avoid `@DirtiesContext`:** This forces the application context to reload, killing performance. Reset state (e.g., clearing the database in `@BeforeEach`) manually instead.
* **Independent Tests:** Every test must be completely independent and capable of running in any order without side effects.
