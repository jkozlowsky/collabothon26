package com.collabothon.back.duel.services;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.duel.DuelAnswerMapper;
import com.collabothon.back.dto.duel.AnswerRequest;
import com.collabothon.back.dto.duel.AnswerResultDto;
import com.collabothon.back.dto.duel.MatchStateDto;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.MatchStatus;
import com.collabothon.back.exceptions.BusinessException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DuelMatchService {

	private final DuelMatchRepository matches;

	private final DuelSelectionService selectionService;

	private final DuelProgressLoader progressLoader;

	private final DuelAnswerRecorder recorder;

	private final DuelScoring scoring;

	private final DuelMatchView view;

	private final DuelAnswerMapper answerMapper;

	private final ApplicationEventPublisher events;

	/** Repeating an already answered index returns its result. */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public AnswerResultDto answer(long matchId, AnswerRequest request) {
		DuelProgress progress = progressLoader.load(progressLoader.findMatch(matchId, request.userId()));
		int index = request.index();
		List<DuelQuestion> questions = selectionService.selectQuestions(progress.getMatch());
		if (index < progress.nextIndex()) {
			return view.answerResult(progress, index, questions);
		}
		if (index != progress.nextIndex()) {
			throw new BusinessException(DuelErrorCode.ANSWER_OUT_OF_ORDER,
					"expected " + progress.nextIndex() + ", got " + index);
		}
		if (progress.isComplete()) {
			throw new BusinessException(DuelErrorCode.ALL_QUESTIONS_ANSWERED);
		}
		recorder.recordAnswer(progress, questions.get(index), answerMapper.toChosenAnswer(request));
		scoring.settle(progress);
		publishLiveProgress(progress);
		return view.answerResult(progress, index, questions);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public MatchStateDto state(long matchId, String userId) {
		DuelMatch match = progressLoader.findMatch(matchId, userId);
		if (match.isLive()) {
			recordOpponentTimeouts(match);
		}
		DuelProgress progress = progressLoader.load(match);
		List<DuelQuestion> questions = selectionService.selectQuestions(match);
		recorder.recordTimeouts(progress, questions);
		scoring.settle(progress);
		return view.state(progress, questions);
	}

	/** The live duels in which the user still has questions to answer. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public List<LiveRivalRef> unfinishedLiveMatches(String userId) {
		List<DuelMatch> running = matches.findByUserIdAndStatusAndOpponentMatchIdIsNotNull(userId,
				MatchStatus.IN_PROGRESS);
		return progressLoader.loadPlayerOnly(running).stream()
			.filter(progress -> !progress.isComplete())
			.map(DuelProgress::getMatch)
			.map(match -> new LiveRivalRef(match.getRivalUserId(), match.getOpponentMatchId()))
			.toList();
	}

	// So a live duel still ends when the opponent has left. Must run before the player's progress is loaded.
	private void recordOpponentTimeouts(DuelMatch match) {
		matches.findById(match.getOpponentMatchId())
			.ifPresent(opponent -> recorder.recordTimeouts(progressLoader.load(opponent),
					selectionService.selectQuestions(opponent)));
	}

	// Sent on the socket by DuelLiveNotifier, only once this transaction has committed.
	private void publishLiveProgress(DuelProgress progress) {
		DuelMatch match = progress.getMatch();
		if (!match.isLive()) {
			return;
		}
		List<Boolean> results = progress.getAnswers().stream().map(DuelAnswer::isCorrect).toList();
		events.publishEvent(new LiveRivalUpdate(match.getRivalUserId(), match.getOpponentMatchId(), results,
				progress.isComplete(), progress.score()));
	}

}
