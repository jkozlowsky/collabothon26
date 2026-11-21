package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.converters.duel.DuelAnswerMapper;
import com.collabothon.back.dto.converters.duel.DuelMatchMapper;
import com.collabothon.back.dto.duel.MatchEndDto;
import com.collabothon.back.dto.duel.ReviewItemDto;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.DuelQuestion;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.dto.lesson.LessonContentItem;
import com.collabothon.back.lesson.repositories.LessonContentRepository;

import lombok.RequiredArgsConstructor;

/** The end screen of a finished match: outcome, XP and a review of every question with its lesson. */
@Service
@RequiredArgsConstructor
public class DuelResultService {

	private final DuelMatchRepository matches;

	private final DuelAnswerRepository answers;

	private final DuelContentRepository content;

	private final LessonContentRepository lessons;

	private final DuelScoring scoring;

	private final DuelPlayerCardService playerCards;

	private final DuelMatchMapper matchMapper;

	private final DuelAnswerMapper answerMapper;

	private final DuelProperties properties;

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
		return matchMapper.toEndDto(match, playerCards.card(userId), playerCards.rivalCard(match),
				scoring.xpByCategory(progress), review(progress));
	}

	private List<ReviewItemDto> review(DuelProgress progress) {
		List<DuelQuestion> questions = content.findMatchQuestions();
		List<ReviewItemDto> review = new ArrayList<>();
		for (DuelAnswer answer : progress.answers()) {
			DuelQuestion question = questions.get(answer.getPosition());
			review.add(new ReviewItemDto(answer.getPosition(), question.category(), question.step(),
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
