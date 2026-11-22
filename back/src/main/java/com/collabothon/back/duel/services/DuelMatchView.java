package com.collabothon.back.duel.services;

import java.util.List;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.converters.duel.DuelAnswerMapper;
import com.collabothon.back.dto.converters.duel.DuelMatchMapper;
import com.collabothon.back.dto.converters.duel.DuelQuestionConverter;
import com.collabothon.back.dto.duel.AnswerResultDto;
import com.collabothon.back.dto.duel.DuelQuestionDto;
import com.collabothon.back.dto.duel.MatchStartDto;
import com.collabothon.back.dto.duel.MatchStateDto;
import com.collabothon.back.dto.duel.RivalSnapshotDto;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;

import lombok.RequiredArgsConstructor;

/** What a player is shown while the match is played. Runs in the caller's transaction. */
@Component
@RequiredArgsConstructor
public class DuelMatchView {

	private final DuelPlayerCardService playerCards;

	private final DuelTimerCalculator timer;

	private final DuelRivalSimulator rival;

	private final DuelScoring scoring;

	private final DuelMatchMapper matchMapper;

	private final DuelAnswerMapper answerMapper;

	private final DuelQuestionConverter questionConverter;

	MatchStartDto start(DuelProgress progress, List<DuelQuestion> questions) {
		DuelMatch match = progress.getMatch();
		return matchMapper.toStartDto(match, playerCards.card(match.getUserId()), playerCards.rivalCard(match),
				progress.getQuestionCount(), question(progress, 0, questions));
	}

	MatchStateDto state(DuelProgress progress, List<DuelQuestion> questions) {
		DuelMatch match = progress.getMatch();
		return matchMapper.toStateDto(match, playerCards.card(match.getUserId()), playerCards.rivalCard(match),
				progress.getQuestionCount(), progress.resultsPerQuestion(progress.getAnswers(), DuelAnswer::isCorrect),
				question(progress, progress.nextIndex(), questions), rivalSnapshot(progress),
				scoring.yourFinal(progress));
	}

	AnswerResultDto answerResult(DuelProgress progress, int index, List<DuelQuestion> questions) {
		return answerMapper.toResultDto(progress.answer(index), question(progress, index + 1, questions),
				rivalSnapshot(progress), scoring.yourFinal(progress), progress.getMatch().isFinished());
	}

	/** Null after the last question. */
	private DuelQuestionDto question(DuelProgress progress, int index, List<DuelQuestion> questions) {
		if (index >= progress.getQuestionCount()) {
			return null;
		}
		DuelQuestion question = questions.get(index);
		long deadline = timer.deadline(question, progress.questionStart(index)).toEpochMilli();
		return questionConverter.toDto(progress.getMatch().getId(), index, question, deadline,
				timer.timeLimitMs(question));
	}

	private RivalSnapshotDto rivalSnapshot(DuelProgress progress) {
		if (!progress.getMatch().isLive()) {
			return rival.snapshot(progress);
		}
		// A live opponent's answers are visible as soon as they are saved.
		List<DuelAnswer> opponent = progress.getOpponentAnswers();
		return new RivalSnapshotDto(opponent.size(), progress.resultsPerQuestion(opponent, DuelAnswer::isCorrect));
	}

}
