package com.collabothon.back.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.Callable;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import com.collabothon.back.Race;
import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.profile.repositories.AccountSessionRepository;
import com.collabothon.back.profile.services.AccountSessionService;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class DemoAccountControllerTests {

	static final MutableClock CLOCK = new MutableClock(Instant.parse("2026-11-23T10:00:00Z"));

	@TestBean
	Clock clock;

	static Clock clock() {
		return CLOCK;
	}

	@Autowired
	MockMvc mvc;

	@Autowired
	AccountSessionRepository sessionRepository;

	@Autowired
	AccountSessionService sessionService;

	@Autowired
	TransactionTemplate tx;

	@BeforeEach
	void setUp() {
		CLOCK.set(Instant.parse("2026-11-23T10:00:00Z"));
		sessionRepository.deleteAll();
	}

	@Test
	void getDemoAccountsReturnsAllThreeInFixedOrderWithStatuses() throws Exception {
		// Initially all free
		mvc.perform(get("/api/demo-accounts").param("deviceId", "dev-1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(3))
				.andExpect(jsonPath("$[0].userId").value("demo-user"))
				.andExpect(jsonPath("$[0].firstName").value("Alex"))
				.andExpect(jsonPath("$[0].lastName").value("Krause"))
				.andExpect(jsonPath("$[0].avatar").value("m1"))
				.andExpect(jsonPath("$[0].status").value("free"))
				.andExpect(jsonPath("$[1].userId").value("demo-daniel"))
				.andExpect(jsonPath("$[1].firstName").value("Daniel"))
				.andExpect(jsonPath("$[1].lastName").value("Okafor"))
				.andExpect(jsonPath("$[1].avatar").value("m2"))
				.andExpect(jsonPath("$[1].status").value("free"))
				.andExpect(jsonPath("$[2].userId").value("demo-elena"))
				.andExpect(jsonPath("$[2].firstName").value("Elena"))
				.andExpect(jsonPath("$[2].lastName").value("Petrova"))
				.andExpect(jsonPath("$[2].avatar").value("f3"))
				.andExpect(jsonPath("$[2].status").value("free"));

		// dev-1 acquires demo-daniel, dev-2 acquires demo-elena
		mvc.perform(post("/api/users/demo-daniel/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk());

		mvc.perform(post("/api/users/demo-elena/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isOk());

		// dev-1 checks: Alex free, Daniel mine, Elena in-use
		mvc.perform(get("/api/demo-accounts").param("deviceId", "dev-1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].status").value("free"))
				.andExpect(jsonPath("$[1].status").value("mine"))
				.andExpect(jsonPath("$[2].status").value("in-use"));

		// dev-2 checks: Alex free, Daniel in-use, Elena mine
		mvc.perform(get("/api/demo-accounts").param("deviceId", "dev-2"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].status").value("free"))
				.andExpect(jsonPath("$[1].status").value("in-use"))
				.andExpect(jsonPath("$[2].status").value("mine"));

		// dev-3 checks (no lock): Alex free, Daniel in-use, Elena in-use
		mvc.perform(get("/api/demo-accounts").param("deviceId", "dev-3"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].status").value("free"))
				.andExpect(jsonPath("$[1].status").value("in-use"))
				.andExpect(jsonPath("$[2].status").value("in-use"));
	}

	@Test
	void acquireFreeAndHeldAccounts() throws Exception {
		// Acquire free -> 200
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-user"))
				.andExpect(jsonPath("$.ttlMs").value(120000))
				.andExpect(jsonPath("$.heartbeatMs").value(30000));

		// Re-acquire by same device -> 200
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-user"));

		// Acquire by another device -> 409
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ACCOUNT_IN_USE"));
	}

	@Test
	void expiryAfter120sAllowsTakeover() throws Exception {
		mvc.perform(post("/api/users/demo-daniel/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk());

		// Advance clock by 119s -> still held
		CLOCK.advance(Duration.ofSeconds(119));
		mvc.perform(post("/api/users/demo-daniel/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isConflict());

		// Advance clock by 2s (total 121s) -> expired, dev-2 can acquire
		CLOCK.advance(Duration.ofSeconds(2));
		mvc.perform(post("/api/users/demo-daniel/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-daniel"));

		// dev-1 tries heartbeat after takeover -> 409
		mvc.perform(put("/api/users/demo-daniel/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ACCOUNT_IN_USE"));
	}

	@Test
	void heartbeatRenewsLease() throws Exception {
		mvc.perform(post("/api/users/demo-elena/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk());

		// Advance 100s
		CLOCK.advance(Duration.ofSeconds(100));

		// Heartbeat from dev-1
		mvc.perform(put("/api/users/demo-elena/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-elena"));

		// Advance another 100s (total 200s from initial acquire, but 100s from heartbeat)
		CLOCK.advance(Duration.ofSeconds(100));

		// Still held by dev-1 -> dev-2 gets 409
		mvc.perform(post("/api/users/demo-elena/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isConflict());
	}

	@Test
	void deleteByNonOwnerIsNoOpAndOwnerReleasesSession() throws Exception {
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk());

		// Delete by dev-2 -> 204, but does not delete session
		mvc.perform(delete("/api/users/demo-user/session").param("deviceId", "dev-2"))
				.andExpect(status().isNoContent());

		// dev-2 still cannot acquire
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isConflict());

		// Delete by dev-1 (owner) -> 204, released
		mvc.perform(delete("/api/users/demo-user/session").param("deviceId", "dev-1"))
				.andExpect(status().isNoContent());

		// Now dev-2 can acquire
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isOk());
	}

	@Test
	void validationErrorsAndUnknownUsers() throws Exception {
		// Unknown user -> 404
		mvc.perform(post("/api/users/unknown-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isNotFound());

		// Non-lockable demo account (e.g. demo-tomasz) -> 404
		mvc.perform(post("/api/users/demo-tomasz/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isNotFound());

		// Blank deviceId -> 400
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"\"}"))
				.andExpect(status().isBadRequest());

		// Null deviceId -> 400
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest());

		// deviceId too long (>64 chars) -> 400
		String longId = "a".repeat(65);
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"" + longId + "\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void concurrentAcquireHasExactlyOneWinner() throws Exception {
		Callable<Integer> first = () -> {
			sessionService.acquireSession("demo-daniel", "dev-first");
			return 200;
		};

		Callable<Boolean> second = () -> {
			Instant now = CLOCK.instant();
			Instant cutoff = now.minus(AccountSessionService.TTL);
			int updated = sessionRepository.tryAcquireOrHeartbeat("demo-daniel", "dev-second", now, cutoff);
			return updated == 1;
		};

		boolean secondWon = Race.secondDuringFirst(tx, first, second);
		assertThat(secondWon).isFalse();

		var session = sessionRepository.findById("demo-daniel").orElseThrow();
		assertThat(session.getDeviceId()).isEqualTo("dev-first");
	}

	static class MutableClock extends Clock {
		private Instant instant;
		private final ZoneId zone;

		MutableClock(Instant initial) {
			this(initial, ZoneId.of("Europe/Warsaw"));
		}

		MutableClock(Instant initial, ZoneId zone) {
			this.instant = initial;
			this.zone = zone;
		}

		void set(Instant instant) {
			this.instant = instant;
		}

		void advance(Duration duration) {
			this.instant = this.instant.plus(duration);
		}

		@Override
		public ZoneId getZone() {
			return zone;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return new MutableClock(instant, zone);
		}

		@Override
		public Instant instant() {
			return instant;
		}
	}
}
