package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.converters.duel.DuelAnswerMapper;
import com.collabothon.back.dto.converters.duel.DuelMatchMapper;
import com.collabothon.back.dto.converters.duel.DuelQuestionConverter;
import com.collabothon.back.dto.duel.CategoryMatchEndDto;
import com.collabothon.back.dto.duel.MatchEndDto;
import com.collabothon.back.dto.duel.ReviewItemDto;
import com.collabothon.back.dto.lesson.LessonContentItem;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.DuelQuestion;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/** The end screen of a finished match: outcome, XP and a review of every question with its lesson. */
@Service
@RequiredArgsConstructor
public class DuelResultService {

	private final DuelMatchRepository matches;

	private final DuelAnswerRepository answers;

	private final DuelSelectionService selectionService;

	private final LessonContentRepository lessons;

	private final DuelScoring scoring;

	private final DuelPlayerCardService playerCards;

	private final DuelMatchMapper matchMapper;

	private final DuelAnswerMapper answerMapper;

	private final DuelQuestionConverter questionConverter;

	private final DuelProperties properties;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	/** Settles the match if it is due and marks it seen; fails with 409 while it is still being played. */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public MatchEndDto result(long matchId, String userId) {
		DuelMatch match = matches.findByIdAndUserId(matchId, userId)
			.orElseThrow(() -> new BusinessException(DuelErrorCode.MATCH_NOT_FOUND, String.valueOf(matchId)));
		DuelProgress progress = new DuelProgress(match, answers.findByMatchIdOrderByPositionAsc(matchId),
				properties.questionsPerMatch());
		scoring.settle(progress);
		if (!match.isFinished()) {
			throw new BusinessException(DuelErrorCode.MATCH_NOT_FINISHED, String.valueOf(matchId));
		}
		match.markSeen();
		Map<String, Integer> xpByCategory = scoring.xpByCategory(progress);
		List<CategoryMatchEndDto> categories = buildCategoryEndDtos(match, xpByCategory);
		return matchMapper.toEndDto(match, playerCards.card(userId), playerCards.rivalCard(match),
				categories, xpByCategory, review(progress));
	}

	private List<CategoryMatchEndDto> buildCategoryEndDtos(DuelMatch match, Map<String, Integer> xpByCategory) {
		if (xpByCategory.isEmpty()) {
			return List.of();
		}
		String userId = match.getUserId();
		Map<String, Integer> currentXp = xpService.xpPerCategory(userId);
		List<CategoryMatchEndDto> result = new ArrayList<>();
		for (Map.Entry<String, Integer> entry : xpByCategory.entrySet()) {
			String story = entry.getKey();
			int gained = entry.getValue();
			if (gained <= 0) {
				continue;
			}
			int xpAfter = currentXp.getOrDefault(story, 0);
			int xpBefore = Math.max(0, xpAfter - gained);
			LevelCurve.LevelInfo before = levelCurve.fromXp(xpBefore);
			LevelCurve.LevelInfo after = levelCurve.fromXp(xpAfter);
			result.add(new CategoryMatchEndDto(
					story,
					gained,
					xpBefore,
					xpAfter,
					before.level(),
					after.level(),
					after.xpIntoLevel(),
					after.xpForLevel()
			));
		}
		return result;
	}

	private List<ReviewItemDto> review(DuelProgress progress) {
		List<DuelQuestion> questions = selectionService.selectQuestions(progress.match());
		List<ReviewItemDto> review = new ArrayList<>();
		long matchId = progress.match().getId() != null ? progress.match().getId() : 0L;
		for (DuelAnswer answer : progress.answers()) {
			int index = answer.getPosition();
			DuelQuestion question = questions.get(index);
			review.add(new ReviewItemDto(index, question.category(),
					questionConverter.toReviewStep(matchId, index, question.step()),
					answerMapper.toDto(answer.getChosenAnswer()), answer.isCorrect(), question.lessonId(),
					lessonTitle(question.lessonId())));
		}
		return review;
	}

	private String lessonTitle(String lessonId) {
		return lessons.findById(lessonId)
			.map(LessonContentItem::title)
			.filter(title -> !title.isBlank())
			.orElse(lessonId);
	}

}
