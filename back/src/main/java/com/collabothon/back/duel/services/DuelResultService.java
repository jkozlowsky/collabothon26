package com.collabothon.back.duel.services;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.duel.DuelAnswerMapper;
import com.collabothon.back.dto.converters.duel.DuelCategoryMapper;
import com.collabothon.back.dto.converters.duel.DuelMatchMapper;
import com.collabothon.back.dto.converters.duel.DuelQuestionConverter;
import com.collabothon.back.dto.duel.CategoryMatchEndDto;
import com.collabothon.back.dto.duel.MatchEndDto;
import com.collabothon.back.dto.duel.ReviewItemDto;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.models.LessonContentItem;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DuelResultService {

	private final DuelProgressLoader progressLoader;

	private final DuelSelectionService selectionService;

	private final LessonContentRepository lessons;

	private final DuelScoring scoring;

	private final DuelPlayerCardService playerCards;

	private final DuelMatchMapper matchMapper;

	private final DuelCategoryMapper categoryMapper;

	private final DuelAnswerMapper answerMapper;

	private final DuelQuestionConverter questionConverter;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	/** Settles the match if it is due and marks it seen. */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public MatchEndDto result(long matchId, String userId) {
		DuelMatch match = progressLoader.findMatch(matchId, userId);
		DuelProgress progress = progressLoader.load(match);
		scoring.settle(progress);
		if (!match.isFinished()) {
			throw new BusinessException(DuelErrorCode.MATCH_NOT_FINISHED, String.valueOf(matchId));
		}
		match.markSeen();
		Map<String, Integer> xpByCategory = scoring.xpByCategory(progress);
		List<CategoryMatchEndDto> categories = categoryResults(userId, xpByCategory);
		return matchMapper.toEndDto(match, playerCards.card(userId), playerCards.rivalCard(match), categories,
				xpByCategory, review(progress));
	}

	private List<CategoryMatchEndDto> categoryResults(String userId, Map<String, Integer> xpByCategory) {
		if (xpByCategory.isEmpty()) {
			return List.of();
		}
		Map<String, Integer> currentXp = xpService.xpPerCategory(userId);
		return xpByCategory.entrySet().stream()
			.map(gain -> categoryResult(gain.getKey(), gain.getValue(), currentXp.getOrDefault(gain.getKey(), 0)))
			.toList();
	}

	private CategoryMatchEndDto categoryResult(String areaSlug, int gained, int xpAfter) {
		int xpBefore = Math.max(0, xpAfter - gained);
		return categoryMapper.toEndDto(areaSlug, gained, xpBefore, xpAfter, levelCurve.fromXp(xpBefore),
				levelCurve.fromXp(xpAfter));
	}

	private List<ReviewItemDto> review(DuelProgress progress) {
		List<DuelQuestion> questions = selectionService.selectQuestions(progress.getMatch());
		return progress.getAnswers().stream()
			.map(answer -> reviewItem(answer, questions.get(answer.getPosition()), progress.getMatch().getId()))
			.toList();
	}

	private ReviewItemDto reviewItem(DuelAnswer answer, DuelQuestion question, long matchId) {
		return answerMapper.toReviewItem(answer, question,
				questionConverter.toReviewStep(matchId, answer.getPosition(), question.step()),
				lessonTitle(question.lessonId()));
	}

	private String lessonTitle(String lessonId) {
		return lessons.findById(lessonId)
			.map(LessonContentItem::title)
			.filter(title -> !title.isBlank())
			.orElse(lessonId);
	}

}
