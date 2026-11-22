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

import com.collabothon.back.MutableClock;
import com.collabothon.back.Race;
import com.collabothon.back.TestcontainersConfiguration;
import com.collabothon.back.entities.profile.AccountSession;
import com.collabothon.back.profile.consts.ProfileConsts;
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
		tx.executeWithoutResult(status -> sessionRepository.deleteAll());
	}

	@Test
	void getDemoAccountsReturnsAllThreeInFixedOrderWithStatuses() throws Exception {
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

		mvc.perform(post("/api/users/demo-daniel/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk());

		mvc.perform(post("/api/users/demo-elena/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isOk());

		mvc.perform(get("/api/demo-accounts").param("deviceId", "dev-1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].status").value("free"))
				.andExpect(jsonPath("$[1].status").value("mine"))
				.andExpect(jsonPath("$[2].status").value("in-use"));

		mvc.perform(get("/api/demo-accounts").param("deviceId", "dev-2"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].status").value("free"))
				.andExpect(jsonPath("$[1].status").value("in-use"))
				.andExpect(jsonPath("$[2].status").value("mine"));

		mvc.perform(get("/api/demo-accounts").param("deviceId", "dev-3"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].status").value("free"))
				.andExpect(jsonPath("$[1].status").value("in-use"))
				.andExpect(jsonPath("$[2].status").value("in-use"));
	}

	@Test
	void acquireFreeAndHeldAccounts() throws Exception {
		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-user"))
				.andExpect(jsonPath("$.ttlMs").value(120000))
				.andExpect(jsonPath("$.heartbeatMs").value(30000));

		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-user"));

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

		CLOCK.advance(Duration.ofSeconds(100));

		mvc.perform(put("/api/users/demo-elena/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-elena"));

		// Advance another 100s (total 200s from initial acquire, but 100s from heartbeat)
		CLOCK.advance(Duration.ofSeconds(100));

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

		mvc.perform(delete("/api/users/demo-user/session").param("deviceId", "dev-2"))
				.andExpect(status().isNoContent());

		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isConflict());

		mvc.perform(delete("/api/users/demo-user/session").param("deviceId", "dev-1"))
				.andExpect(status().isNoContent());

		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-2\"}"))
				.andExpect(status().isOk());
	}

	@Test
	void validationErrorsAndUnknownUsers() throws Exception {
		mvc.perform(post("/api/users/unknown-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isNotFound());

		mvc.perform(post("/api/users/demo-tomasz/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isNotFound());

		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"\"}"))
				.andExpect(status().isBadRequest());

		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest());

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
			Instant cutoff = now.minus(ProfileConsts.SESSION_TTL);
			int updated = tx.execute(status -> sessionRepository.tryAcquireOrHeartbeat("demo-daniel", "dev-second", now,
					cutoff));
			return updated == 1;
		};

		boolean secondWon = Race.secondDuringFirst(tx, first, second);
		assertThat(secondWon).isFalse();

		AccountSession session = tx.execute(status -> sessionRepository.findById("demo-daniel")).orElseThrow();
		assertThat(session.getDeviceId()).isEqualTo("dev-first");
	}

}
