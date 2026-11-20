package com.collabothon.back.duel;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;

/** Runs against the demo data of V12 (Alex = demo-user, this week's league). */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class DuelControllerTests {

	@TestBean
	Clock clock;

	// The seeded league matches are dated relative to the database clock, so "now" must be real.
	static Clock clock() {
		return Clock.fixed(Instant.now(), ZoneId.of("Europe/Berlin"));
	}

	@Autowired
	MockMvc mvc;

	@Test
	void categoriesShowTheCallersLevelAndEloInTheRequestedLanguage() throws Exception {
		mvc.perform(get("/api/duel/categories").param("userId", "demo-user").param("lang", "pl"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(5))
			.andExpect(jsonPath("$[0].slug").value("instruments"))
			.andExpect(jsonPath("$[0].name").value("Instrumenty"))
			.andExpect(jsonPath("$[0].icon").value("trend"))
			.andExpect(jsonPath("$[0].level").value(42))
			.andExpect(jsonPath("$[0].elo").value(1156))
			.andExpect(jsonPath("$[0].calibrated").value(true))
			.andExpect(jsonPath("$[2].calibrated").value(false));
	}

	@Test
	void anUnknownPlayerStartsAtLevelOneAndElo1000() throws Exception {
		mvc.perform(get("/api/duel/categories").param("userId", "nobody"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].name").value("Instruments"))
			.andExpect(jsonPath("$[0].level").value(1))
			.andExpect(jsonPath("$[0].elo").value(1000))
			.andExpect(jsonPath("$[0].humanMatches").value(0));
	}

	@Test
	void blankUserIdIsRejected() throws Exception {
		mvc.perform(get("/api/duel/categories").param("userId", "  ")).andExpect(status().isBadRequest());
	}

	@Test
	void progressListsEveryCategoryWithNullAccuracyWithoutAnswers() throws Exception {
		mvc.perform(get("/api/duel/progress/demo-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(5))
			.andExpect(jsonPath("$[0].category").value("instruments"))
			.andExpect(jsonPath("$[0].xp").value(3731))
			.andExpect(jsonPath("$[0].level").value(42))
			.andExpect(jsonPath("$[0].accuracyLast30d").isEmpty());
	}

	@Test
	void categoryRankingPinsTheCallerRow() throws Exception {
		mvc.perform(get("/api/duel/rankings").param("scope", "category")
			.param("category", "instruments")
			.param("userId", "demo-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.top[0].rank").value(1))
			.andExpect(jsonPath("$.me.userId").value("demo-user"))
			.andExpect(jsonPath("$.me.name").value("Alex"))
			.andExpect(jsonPath("$.me.avatar").value(2))
			.andExpect(jsonPath("$.me.elo").value(1156));
	}

	@Test
	void weeklyLeagueRanksByEloGainedThisWeek() throws Exception {
		mvc.perform(get("/api/duel/rankings").param("scope", "weekly").param("userId", "demo-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.top[0].userId").value("demo-tomasz"))
			.andExpect(jsonPath("$.top[0].value").value(142))
			.andExpect(jsonPath("$.me.value").value(46));
	}

	@Test
	void rankingErrorsAreBadRequests() throws Exception {
		mvc.perform(get("/api/duel/rankings").param("scope", "galaxy")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/duel/rankings").param("scope", "category")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/duel/rankings").param("scope", "category").param("category", "nope"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Unknown category: nope"));
	}

	@Test
	void unknownMatchIsNotFound() throws Exception {
		mvc.perform(get("/api/duel/matches/999999").param("userId", "demo-user"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.detail").value("Match not found: 999999"));
	}

	@Test
	void aFinishedMatchIsOnlyVisibleToItsPlayers() throws Exception {
		// Match 34 is Alex vs Nina in Investor psychology (seeded, finished).
		mvc.perform(get("/api/duel/matches/34").param("userId", "demo-user"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.matchId").value(34))
			.andExpect(jsonPath("$.mode").value("HUMAN"))
			.andExpect(jsonPath("$.category").value("psychology"))
			.andExpect(jsonPath("$.outcome").value("WIN"))
			.andExpect(jsonPath("$.score").value(5))
			.andExpect(jsonPath("$.rivalScore").value(3))
			.andExpect(jsonPath("$.rival.name").value("Nina"))
			.andExpect(jsonPath("$.rival.isBot").value(false));
		mvc.perform(get("/api/duel/matches/34").param("userId", "demo-jonas")).andExpect(status().isNotFound());
	}

}
