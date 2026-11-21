package com.collabothon.back.duel.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.converters.duel.DuelAnswerMapper;
import com.collabothon.back.dto.converters.duel.DuelMatchMapper;
import com.collabothon.back.dto.converters.duel.DuelQuestionConverter;
import com.collabothon.back.dto.duel.CategoryMatchEndDto;
import com.collabothon.back.dto.duel.MatchEndDto;
import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.DuelMode;
import com.collabothon.back.entities.duel.DuelQuestion;
import com.collabothon.back.entities.duel.MatchOutcome;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

import tools.jackson.databind.node.JsonNodeFactory;

@ExtendWith(MockitoExtension.class)
class DuelResultServiceTest {

	@Mock
	DuelMatchRepository matches;

	@Mock
	DuelAnswerRepository answers;

	@Mock
	DuelSelectionService selectionService;

	@Mock
	LessonContentRepository lessons;

	@Mock
	DuelScoring scoring;

	@Mock
	DuelPlayerCardService playerCards;

	@Mock
	DuelAnswerMapper answerMapper;

	@Mock
	DuelQuestionConverter questionConverter;

	@Mock
	XpService xpService;

	DuelMatchMapper matchMapper = Mappers.getMapper(DuelMatchMapper.class);

	LevelCurve levelCurve = new LevelCurve();

	DuelProperties properties = new DuelProperties();

	DuelResultService service;

	@BeforeEach
	void setUp() {
		service = new DuelResultService(matches, answers, selectionService, lessons, scoring, playerCards,
				matchMapper, answerMapper, questionConverter, properties, xpService, levelCurve);
	}

	@Test
	void resultPopulatesCategoriesWithLevelBeforeAndAfter() {
		long matchId = 10L;
		String userId = "player1";
		DuelMatch match = DuelMatch.start(DuelMode.HUMAN, List.of("berlin"), userId, "rival1", Instant.now());
		org.springframework.test.util.ReflectionTestUtils.setField(match, "id", matchId);
		match.finish(MatchOutcome.WIN, 5, 3, Instant.now());

		when(matches.findByIdAndUserId(matchId, userId)).thenReturn(Optional.of(match));
		when(answers.findByMatchIdOrderByPositionAsc(matchId)).thenReturn(List.of());
		when(selectionService.selectQuestions(match)).thenReturn(List.of());
		when(playerCards.card(userId)).thenReturn(new PlayerCardDto("Player", "m1", Map.of()));
		when(playerCards.rivalCard(match)).thenReturn(new PlayerCardDto("Rival", "f1", Map.of()));

		// Berlin awarded 25 XP in this match
		when(scoring.xpByCategory(any())).thenReturn(Map.of("berlin", 25));

		// Player now has 30 XP total in berlin (25 gained + 5 before)
		// Level 1 threshold: 0, Level 2 threshold: 22.
		// 5 XP -> Level 1 (xpIntoLevel=5, xpForLevel=22)
		// 30 XP -> Level 2 (xpIntoLevel=8, xpForLevel=24)
		when(xpService.xpPerCategory(userId)).thenReturn(Map.of("berlin", 30));

		MatchEndDto endDto = service.result(matchId, userId);
		assertThat(endDto.categories()).hasSize(1);

		CategoryMatchEndDto cat = endDto.categories().getFirst();
		assertThat(cat.story()).isEqualTo("berlin");
		assertThat(cat.xpGained()).isEqualTo(25);
		assertThat(cat.xpBefore()).isEqualTo(5);
		assertThat(cat.xpAfter()).isEqualTo(30);
		assertThat(cat.levelBefore()).isEqualTo(1);
		assertThat(cat.levelAfter()).isEqualTo(2); // Level up!
		assertThat(cat.levelAfter()).isGreaterThan(cat.levelBefore());
		assertThat(cat.xpIntoLevelAfter()).isEqualTo(8);
		assertThat(cat.xpForLevelAfter()).isEqualTo(24);
	}

	@Test
	void resultHasEmptyCategoriesWhenNoXpGainedInSoloMatch() {
		long matchId = 11L;
		String userId = "player1";
		DuelMatch match = DuelMatch.start(DuelMode.SOLO, List.of("berlin"), userId, null, Instant.now());
		org.springframework.test.util.ReflectionTestUtils.setField(match, "id", matchId);
		match.finish(MatchOutcome.SOLO, 4, null, Instant.now());

		when(matches.findByIdAndUserId(matchId, userId)).thenReturn(Optional.of(match));
		when(answers.findByMatchIdOrderByPositionAsc(matchId)).thenReturn(List.of());
		when(selectionService.selectQuestions(match)).thenReturn(List.of());
		when(scoring.xpByCategory(any())).thenReturn(Map.of());

		MatchEndDto endDto = service.result(matchId, userId);
		assertThat(endDto.categories()).isEmpty();
	}

}
