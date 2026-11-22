package com.collabothon.back.duel.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.dto.duel.MatchSummaryDto;
import com.collabothon.back.dto.duel.MatchSummaryStatus;
import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.dto.duel.RankingRowDto;
import com.collabothon.back.dto.duel.RankingsDto;
import com.collabothon.back.dto.duel.StartMatchRequest;
import com.collabothon.back.duel.services.DuelErrorCode;
import com.collabothon.back.duel.services.DuelHistoryService;
import com.collabothon.back.duel.services.DuelLobbyService;
import com.collabothon.back.duel.services.DuelMatchService;
import com.collabothon.back.duel.services.DuelRankingService;
import com.collabothon.back.duel.services.DuelResultService;
import com.collabothon.back.duel.services.DuelStartService;
import com.collabothon.back.entities.duel.DuelMode;
import com.collabothon.back.exceptions.BusinessException;

@WebMvcTest(DuelController.class)
class DuelControllerTests {

	@Autowired
	MockMvc mvc;

	@MockitoBean
	DuelLobbyService lobbyService;

	@MockitoBean
	DuelStartService startService;

	@MockitoBean
	DuelMatchService matchService;

	@MockitoBean
	DuelResultService resultService;

	@MockitoBean
	DuelHistoryService historyService;

	@MockitoBean
	DuelRankingService rankingService;

	@Test
	void startRejectsAMissingUserIdOrNoCategoriesBeforeTheService() throws Exception {
		mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\" \",\"categories\":[\"berlin\"],\"mode\":\"SOLO\"}"))
			.andExpect(status().isBadRequest());
		mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"u1\",\"categories\":[],\"mode\":\"SOLO\"}"))
			.andExpect(status().isBadRequest());
		mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"u1\",\"categories\":[\"berlin\"],\"mode\":\"BOT\"}"))
			.andExpect(status().isBadRequest());

		verifyNoInteractions(startService);
	}

	@Test
	void startRejectsMoreThanFourCategoriesBeforeTheService() throws Exception {
		mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"u1\",\"categories\":[\"a\",\"b\",\"c\",\"d\",\"e\"],"
					+ "\"mode\":\"SOLO\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Invalid request content."));
		verifyNoInteractions(startService);

		mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"u1\",\"categories\":[\"a\",\"b\",\"c\",\"d\"],\"mode\":\"SOLO\"}"))
			.andExpect(status().isOk());
	}

	@Test
	void businessErrorsBecomeProblemDetailsWithTheirCode() throws Exception {
		when(startService.start(any(StartMatchRequest.class)))
			.thenThrow(new BusinessException(DuelErrorCode.UNKNOWN_CATEGORY, "mars"));

		mvc.perform(post("/api/duel/matches").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"u1\",\"categories\":[\"mars\"],\"mode\":\"SOLO\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("UNKNOWN_CATEGORY"))
			.andExpect(jsonPath("$.detail").value(DuelErrorCode.UNKNOWN_CATEGORY.getMessage()));
	}

	@Test
	void resultOfAnUnfinishedMatchIsAConflict() throws Exception {
		when(resultService.result(7L, "u1")).thenThrow(new BusinessException(DuelErrorCode.MATCH_NOT_FINISHED));

		mvc.perform(get("/api/duel/matches/7").param("userId", "u1"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("MATCH_NOT_FINISHED"));
	}

	@Test
	void unknownMatchIsNotFound() throws Exception {
		when(matchService.state(anyLong(), eq("u1"))).thenThrow(new BusinessException(DuelErrorCode.MATCH_NOT_FOUND));

		mvc.perform(get("/api/duel/matches/99/state").param("userId", "u1"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("MATCH_NOT_FOUND"));
	}

	@Test
	void stateRejectsANonPositiveIdAndAMissingUserId() throws Exception {
		mvc.perform(get("/api/duel/matches/0/state").param("userId", "u1")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/duel/matches/1/state")).andExpect(status().isBadRequest());

		verifyNoInteractions(matchService);
	}

	@Test
	void answerRejectsANegativeIndex() throws Exception {
		mvc.perform(post("/api/duel/matches/1/answers").contentType(MediaType.APPLICATION_JSON)
			.content("{\"userId\":\"u1\",\"index\":-1,\"option\":0}"))
			.andExpect(status().isBadRequest());

		verifyNoInteractions(matchService);
	}

	@Test
	void historyKeepsTheContractShape() throws Exception {
		PlayerCardDto rival = new PlayerCardDto("Ola", "f1", Map.of("berlin", 2));
		when(historyService.history("u1")).thenReturn(List.of(new MatchSummaryDto(5, DuelMode.HUMAN,
				List.of("berlin"), rival, MatchSummaryStatus.RIVAL_PLAYING, false, 4, null, null, 20,
				"2026-11-23T10:00:00Z")));

		mvc.perform(get("/api/duel/matches").param("userId", "u1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].matchId").value(5))
			.andExpect(jsonPath("$[0].mode").value("HUMAN"))
			.andExpect(jsonPath("$[0].status").value("RIVAL_PLAYING"))
			.andExpect(jsonPath("$[0].rival.levels.berlin").value(2))
			.andExpect(jsonPath("$[0].startedAt").value("2026-11-23T10:00:00Z"));
	}

	@Test
	void rankingsWithoutAUserHaveNoOwnRow() throws Exception {
		when(rankingService.weeklyRankings(null))
			.thenReturn(new RankingsDto(List.of(new RankingRowDto(1, "demo-ola", "Ola", "f1", 3, 265, null, null)), null));

		mvc.perform(get("/api/duel/rankings"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.top[0].rank").value(1))
			.andExpect(jsonPath("$.top[0].weeklyXp").value(265))
			.andExpect(jsonPath("$.me").isEmpty());
	}

}
