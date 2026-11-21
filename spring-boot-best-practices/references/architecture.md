# Spring Boot Architecture & Design Best Practices

A solid architectural foundation is crucial for maintainable Spring Boot applications.

## 1. Layered Architecture
* Use the project's **hybrid package-by-feature** architecture.
* Modules representing main domain areas should contain their own `controllers`, `services`, and `repositories`.
  * `mpp` holds almost all features.
  * `audit` holds the JaVers endpoint.
  * `mok` is only a remnant (email client stub, version hash, two dictionary repositories). Account management moved to the separate `auth-service-1` module, so don't add account features to `api`.
* Clients for other services live in `mpp/clients/<service>/` (`gitea`, `auth`, `mcp`). Each is an interface plus an implementation (Spring `RestClient`, configured in `config/<service>/…ClientConfig`).
* Cross-cutting concerns and shared objects should reside in shared top-level packages such as `entities`, `dto` (including MapStruct converters), `config`, and `exceptions`.

## 2. API Design & Data Modeling Guidelines
* **API Context:** The default API context (`/api`) is set via `server.servlet.context-path` in `infra/base/config-repo/api.properties` (the module's own `src/main/resources/application.properties` is nearly empty). Do not manually prepend `/api` to controller mappings, and note that the API is not explicitly versioned in the paths.
* **API First:** Define your contracts (e.g., OpenAPI/Swagger) before writing code.
* **Stateless Backend:** The backend application must be strictly stateless. Do not use server-side HTTP sessions; rely entirely on token-based authentication (like JWT/OAuth2).
* **RESTful Principles:** Use appropriate HTTP verbs (GET, POST, PUT, PATCH, DELETE) and return standard HTTP status codes.
* **Use ResponseEntity:** Always wrap your controller return types in a `ResponseEntity<T>` to explicitly manage HTTP status codes and headers, rather than returning raw objects or primitives.
* **Use DTOs and MapStruct:** Never expose your internal Domain/Entity models directly to the outside world. Use Data Transfer Objects (DTOs). **Always use MapStruct** to map between entities and DTOs.
* **Use Lombok:** Avoid writing boilerplate code manually. **Always use Lombok annotations** (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`) for Entities, DTOs, and injected dependencies (`@RequiredArgsConstructor`).
* **JPA Entity Warning:** **Never use `@Data`, `@ToString`, or `@EqualsAndHashCode` on JPA Entities**, as they can trigger unintended lazy loading and cause severe performance issues or infinite loops.

## 3. Dependency Injection
* **Favor Constructor Injection:** Always use constructor injection instead of field injection (`@Autowired` on variables). It ensures immutability (`final` fields) and makes testing significantly easier.
* **Services are concrete `@Service` classes.** `api` does **not** use a `FooService` interface + `FooServiceImpl` split — follow the existing pattern (`SubjectService`, `ReportService`, `StageService`, …) and inject the concrete class. Do not introduce service interfaces. The exception is clients for other services: interface plus implementation, see §1. Repositories are Spring Data interfaces extending `JpaRepository<T, UUID>` directly (there is no shared base repository).

## 4. Error Handling
* **Application Exceptions:** Throw `BusinessException` with an appropriate `ErrorCode` enum for all application-level errors. **Always create localization messages (i18n) for new error codes** so they can be translated properly.
* **Global Exception Handler:** The exception handler is already present in the project. Rely on it to catch and translate `BusinessException` to standard error responses. Do not create new exception handlers or return custom error JSON structures.

## 5. Configuration Management
* Externalize configuration to `infra/base/config-repo/<module>.properties` (e.g. `infra/base/config-repo/api.properties`), not the module's local `application.properties`. Kustomize turns these files into the `app-config-files` ConfigMap, mounted into the pod as `/app/config/application.properties`. There is no Config Server any more.
* A new file in `config-repo/` also has to be listed under `configMapGenerator` in `infra/base/kustomization.yaml`. Otherwise it never reaches the pod.
* Secrets are supplied via env vars, which in K8s come from HashiCorp Vault through external-secrets. For tests, put values in `api/src/test/resources/application.properties`.
* Use `@ConfigurationProperties` for type-safe, validated configuration blocks instead of scattering `@Value` annotations everywhere.

## 5a. Current User, Roles & Other Services
* **Users are UUIDs.** `api` stores no accounts; the JWT subject is the user's UUID. Reference users by UUID fields (`SubjectAssignmentEntity.teacherId`, `RepositoryEntity.studentIds`), never by login or an account entity.
* **Current user:** call `SecurityUtils.getCurrentUserId()`. Don't add a `Principal` parameter to controllers or pass logins into services.
* **Global roles:** `@PreAuthorize("hasAuthority(T(pl.lodz.p.it.ssbd2026.ssbd01.config.consts.AccountConsts).ROLE_TEACHER)")`. The constants' values are `ADMIN` / `TEACHER` / `STUDENT`, with no `ROLE_` prefix, so always go through `AccountConsts`, never string literals.
* **Per-subject access:** a teacher's rights on a subject come only from a current `SubjectAssignmentEntity` with a `TeacherSubjectRole`:
  * `OWNER` / `EDITOR` for changes;
  * any role for reading.

  Being `subject.createdBy` is **not** enough, because a creator can be removed from the subject. Check it in the service, and add a test that covers an unassigned teacher.
* **Data owned by another service** (user names, emails): go through its client (`mpp/clients/auth/AuthServiceClient`). When that service doesn't expose the endpoint yet, keep the call behind the client with a stub/fallback and a `// TODO auth-service:` comment. Don't change DTOs to work around the missing data.

## 6. Logging and Interceptors
* **Standardized Logging:** Always use the custom `@MethodCallLogged` annotation on controllers and services, and the `@TransactionLogged` annotation on transactional services to ensure standardized method tracking and transaction auditing.

## 7. Java Code Style

* **Never write an inline fully-qualified class name.** Always add a file import at the top and use the simple name. This is non-negotiable — it is the single most common review comment on this project.
  ```java
  // WRONG
  } catch (com.fasterxml.jackson.core.JsonProcessingException e) { … }
  for (pl.lodz.p.it.ssbd2026.ssbd01.dto.mpp.ReportClusterDTO cluster : clusters) { … }
  return new pl.lodz.p.it.ssbd2026.ssbd01.dto.mpp.ReportParametersDTO(…);
  java.util.Arrays.asList(value.split(","));
  org.junit.jupiter.api.Assertions.assertTrue(condition);

  // RIGHT — import JsonProcessingException / ReportClusterDTO / ReportParametersDTO / Arrays,
  // and static-import assertTrue
  } catch (JsonProcessingException e) { … }
  for (ReportClusterDTO cluster : clusters) { … }
  return new ReportParametersDTO(…);
  Arrays.asList(value.split(","));
  assertTrue(condition);
  ```
  The **only** exceptions are places where a simple name genuinely cannot be resolved: FQNs inside SpEL / JPQL **string literals** (`@PreAuthorize("hasAuthority(T(…AccountConsts).ROLE_TEACHER)")`, `@Query`), and javadoc `{@link}`.
* **Prefer `Objects.requireNonNullElse(x, default)`** over `x != null ? x : default`. It says what it means and evaluates `x` once.
* **Don't write ternaries** (`cond ? a : b`) in new or rewritten code. Assign a local in an `if` / `else` block, or extract a small private helper. When you touch a line next to an existing ternary on the same condition, fold it into the same `if`. Existing ternaries you don't touch can stay.
  ```java
  // WRONG
  bars.add(new HistogramBar(bin.label(), bin.count(), Math.max(heightPx, bin.count() > 0 ? 2 : 0), hot));
  // RIGHT
  bars.add(new HistogramBar(bin.label(), bin.count(), barHeightPx(bin.count(), maxCount), hot));
  ```
* **MapStruct `@Mapper` interfaces contain only generated methods.** Never add hand-written `default` methods to them. Put hand-written mapping or join logic (e.g. combining entities with data from the auth service) in a separate `@Component` in `dto/converters`, like `VersionHashMapper` and `StudentMapper`. Enum-to-enum conversions (e.g. our `ClusteringAlgorithmType` to JPlag's `ClusteringAlgorithm`) are declared as abstract mapper methods, so the build fails if the enums drift apart.
* **Don't expose library enums in DTOs.** Jackson 3 (web layer) reads and writes enums via `toString()`, so a library enum with a custom `toString()` changes the JSON contract. Define our own enum in `dto` and map it with MapStruct.
* **Never call the same getter twice in one expression** to null-check then use it — hoist it to a local first.
* **Prefer guard clauses / early returns.** Keep method bodies under ~3 levels of nesting.
* **Name your magic numbers.** A literal that appears in a condition and again in the body belongs in a `private static final`.
