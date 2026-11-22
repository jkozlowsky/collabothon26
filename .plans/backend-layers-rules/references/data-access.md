# Spring Boot Data Access & Performance Best Practices

Efficient data access is critical for Spring Boot performance.

## 1. Optimize JPA and Hibernate
* **Solve N+1 Queries:** This is the most common JPA performance killer. Use `JOIN FETCH` in your JPQL queries or `@EntityGraph` to eagerly load related entities in a single query when needed.
* **Projections:** If you only need a few columns from a large entity, use JPA Projections (interfaces or DTOs) instead of loading the entire entity into memory.
  * Prefer a **closed interface projection returned by a derived query** (`Page<StageReportProjection> findAllByStageIdAndIsStudentReportFalse(UUID stageId, Pageable pageable)`) over a hand-written `@Query` with `SELECT new …DTO(…)`. Nested values use a nested interface (`SubjectName getSubject()`).
  * Only write `@Query` when a derived query can't express it (aggregates, joins over element collections, locking).
  * Name new projections `…Projection`, **without** a `DTO` suffix. The older `…ProjectionDTO` classes predate this rule.
* **Pagination:** Always paginate large data sets using Spring Data's `Pageable` interface. Never return unbounded lists from the database.
* **Batch Processing:** Enable JDBC batch inserts/updates (`spring.jpa.properties.hibernate.jdbc.batch_size`) when persisting large amounts of data.

## 2. JPA Entity Modeling and Transactions
* **Transactions:** **Always** explicitly specify the `transactionManager` pointing to the specific module (e.g., `"mokTransactionManager"`, `"mppTransactionManager"`), the `readOnly` status, and the `propagation` level (e.g., `propagation = Propagation.REQUIRED`) on every `@Transactional` annotation. **For repositories, the propagation level must always be `Propagation.MANDATORY`**.
* **Base Classes:** Always extend `BaseEntity` (`pl.lodz.p.it.ssbd2026.ssbd01.entities.BaseEntity`) when creating new entities to inherit the common fields: UUID `id`, `@Version` `version`, `createdAt`/`updatedAt` (`Instant`), and `createdBy`/`modifiedBy` (user UUIDs). Repositories extend `JpaRepository<T, UUID>` directly. There is no shared base repository.
* **No foreign keys to users.** There is no account table in `api`'s database any more, so a column holding a user id is a plain `UUID` with an index and no FK. This includes migrations: never write `REFERENCES account (id)`.
* **Retryability:** Frequently use `@Retryable(retryFor = {JpaSystemException.class, OptimisticLockingFailureException.class}, ...)` on service methods to handle transient database errors and optimistic locking failures automatically.
* **Explicit Column Mapping:** **Always** add the `@Column` annotation to **every single field** in an Entity, explicitly defining the `name` (and other constraints like `nullable`, `unique`, `length` when applicable).
* **Lombok Restrictions:** Never use `@Data`, `@EqualsAndHashCode`, or `@ToString` on entities. They trigger lazy loading of relationships and cause performance bottlenecks.

## 3. Database Migrations
* Do **not** create or generate database migrations (like Flyway) automatically or manually. The user will generate migrations manually through the IDE.
* When an existing migration needs fixing (e.g. after a merge), keep these rules:
  * **Filename:** `V<n>__description.sql` with a **double** underscore. With a single `_`, Flyway silently skips the file.
  * **Unique version numbers.** Branches are developed in parallel, so after merging, check `api/src/main/resources/db/migration` for two files with the same `V<n>`. The branch that merges to `main` first keeps its number; renumber the other to the next free version.
  * **Stale copies:** after renumbering, run `mvn clean`. Maven doesn't remove the old copy from `target/`, and Flyway would then see both.
  * **Two runners:** migrations are applied by Spring Flyway on the `admin` datasource, and in K8s also by the `apai-flyway` init container (Flyway CLI, `Dockerfile.flyway`). Both read the same folder.
  * **Test datasets:** when a migration adds a `NOT NULL` column, the CSVs in `src/test/resources/datasets/` need that column too. Otherwise every integration test fails while loading data.

## 4. Caching Strategy
* Use Spring's `@Cacheable` abstraction for data that is read frequently but rarely updated.
* Choose a robust caching provider like Redis or Caffeine for production, rather than relying on the default in-memory concurrent map.
* Be careful with cache invalidation (`@CacheEvict`) to avoid serving stale data.

## 5. Connection Pooling
* Spring Boot uses HikariCP by default, which is highly optimized. Ensure it is correctly tuned for your specific database and load (e.g., setting `maximum-pool-size` and timeouts appropriately).

## 6. Observability and Monitoring
* Enable Spring Boot Actuator (`/actuator/health`, `/actuator/metrics`).
* Use Micrometer to expose metrics to a monitoring system like Prometheus/Grafana.
* Log slow queries to identify bottlenecks in production.
