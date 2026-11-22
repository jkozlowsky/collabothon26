package com.collabothon.back.duel.services;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.converters.duel.DuelAnswerMapper;
import com.collabothon.back.dto.converters.duel.DuelMatchMapper;
import com.collabothon.back.dto.converters.duel.DuelQuestionConverter;
import com.collabothon.back.dto.duel.AnswerRequest;
import com.collabothon.back.dto.duel.AnswerResultDto;
import com.collabothon.back.dto.duel.DuelQuestionDto;
import com.collabothon.back.dto.duel.MatchStartDto;
import com.collabothon.back.dto.duel.MatchStateDto;
import com.collabothon.back.dto.duel.StartMatchRequest;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.AnswerOutcome;
import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.DuelMode;
import com.collabothon.back.entities.duel.DuelQuestion;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.StoryRepository;

import lombok.RequiredArgsConstructor;

/**
 * The match lifecycle while it is played: start, answer one question at a time, and poll the state. A question's
 * clock starts when the previous one was answered; a question left past its deadline counts as a timeout, written
 * lazily the next time the match is read.
 */
@Service
@RequiredArgsConstructor
public class DuelMatchService {

	static final int MAX_CATEGORIES = 4;

	private final DuelMatchRepository matches;

	private final DuelAnswerRepository answers;

	private final DuelSelectionService selectionService;

	private final StoryRepository stories;

	private final DuelTimerCalculator timer;

	private final DuelStepGrader grader;

	private final DuelRivalSimulator rival;

	private final DuelScoring scoring;

	private final DuelPlayerCardService playerCards;

	private final DuelMatchMapper matchMapper;

	private final DuelAnswerMapper answerMapper;

	private final DuelQuestionConverter questionConverter;

	private final DuelProperties properties;

	private final Clock clock;

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public MatchStartDto start(StartMatchRequest request) {
		validateCategories(request.categories());
		String rivalUserId = null;
		if (request.mode() == DuelMode.HUMAN) {
			rivalUserId = rival.pickRival(request.userId());
		}
		DuelMatch match = matches.save(DuelMatch.start(request.mode(), request.categories(), request.userId(),
				rivalUserId, clock.instant()));
		List<DuelQuestion> questions = selectionService.selectQuestions(match);
		DuelProgress progress = new DuelProgress(match, List.of(), questionCount());
		return matchMapper.toStartDto(match, playerCards.card(match.getUserId()), playerCards.rivalCard(match),
				questionCount(), question(progress, 0, questions));
	}

	/** Records the answer to question {@code request.index()}. Repeating an already answered index returns its result. */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public AnswerResultDto answer(long matchId, AnswerRequest request) {
		DuelProgress progress = load(matchId, request.userId());
		int index = request.index();
		List<DuelQuestion> questions = selectionService.selectQuestions(progress.match());
		if (index < progress.nextIndex()) {
			return answerResult(progress, index, questions);
		}
		if (index != progress.nextIndex()) {
			throw new BusinessException(DuelErrorCode.ANSWER_OUT_OF_ORDER,
					"expected " + progress.nextIndex() + ", got " + index);
		}
		if (progress.isComplete()) {
			throw new BusinessException(DuelErrorCode.ALL_QUESTIONS_ANSWERED);
		}
		progress.add(answers.save(gradeAnswer(progress, answerMapper.toChosenAnswer(request), questions)));
		scoring.settle(progress);
		return answerResult(progress, index, questions);
	}

	/** The match as the player sees it now; also writes timeouts for questions whose deadline has passed. */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public MatchStateDto state(long matchId, String userId) {
		DuelProgress progress = load(matchId, userId);
		List<DuelQuestion> questions = selectionService.selectQuestions(progress.match());
		recordTimeouts(progress, questions);
		scoring.settle(progress);
		DuelMatch match = progress.match();
		return matchMapper.toStateDto(match, playerCards.card(match.getUserId()), playerCards.rivalCard(match),
				progress.questionCount(), progress.results(), currentQuestion(progress, questions), rival.snapshot(progress),
				scoring.yourFinal(progress));
	}

	private void validateCategories(List<String> categories) {
		if (categories.isEmpty() || categories.size() > MAX_CATEGORIES) {
			throw new BusinessException(DuelErrorCode.INVALID_CATEGORY_COUNT);
		}
		Set<String> storyIds = stories.findAll().stream().map(Story::id).collect(Collectors.toSet());
		for (String category : categories) {
			if (!storyIds.contains(category)) {
				throw new BusinessException(DuelErrorCode.UNKNOWN_CATEGORY, category);
			}
		}
	}

	private DuelProgress load(long matchId, String userId) {
		DuelMatch match = matches.findByIdAndUserId(matchId, userId)
			.orElseThrow(() -> new BusinessException(DuelErrorCode.MATCH_NOT_FOUND, String.valueOf(matchId)));
		return new DuelProgress(match, answers.findByMatchIdOrderByPositionAsc(matchId), questionCount());
	}

	/** Grades the next question's answer; an answer after the deadline is a timeout and is not graded. */
	private DuelAnswer gradeAnswer(DuelProgress progress, ChosenAnswer chosen, List<DuelQuestion> questions) {
		int index = progress.nextIndex();
		DuelQuestion question = questions.get(index);
		Instant start = progress.questionStart(index);
		long timeLimitMs = timer.timeLimitMs(question);
		Instant deadline = start.plusMillis(timeLimitMs);
		Instant now = clock.instant();
		if (now.isAfter(deadline)) {
			return timeout(progress, question, deadline, now);
		}
		boolean correct = grader.grade(progress.match().getId(), index, question, chosen);
		DuelAnswer.DuelAnswerBuilder answer = baseAnswer(progress, question)
			.chosenAnswer(chosen)
			.correct(correct)
			.outcome(AnswerOutcome.ANSWERED)
			.msTaken(Math.toIntExact(now.toEpochMilli() - start.toEpochMilli()))
			.createdAt(now);
		withRival(answer, progress, correct, now);
		return answer.build();
	}

	/** Writes a timeout for every question whose deadline passed without an answer. */
	private void recordTimeouts(DuelProgress progress, List<DuelQuestion> questions) {
		Instant now = clock.instant();
		while (!progress.match().isFinished() && !progress.isComplete()) {
			int index = progress.nextIndex();
			DuelQuestion question = questions.get(index);
			Instant deadline = progress.questionStart(index).plusMillis(timer.timeLimitMs(question));
			if (!now.isAfter(deadline)) {
				return;
			}
			progress.add(answers.save(timeout(progress, question, deadline, deadline)));
		}
	}

	private DuelAnswer timeout(DuelProgress progress, DuelQuestion question, Instant deadline, Instant recordedAt) {
		DuelAnswer.DuelAnswerBuilder answer = baseAnswer(progress, question)
			.correct(false)
			.outcome(AnswerOutcome.TIMEOUT)
			.msTaken(Math.toIntExact(timer.timeLimitMs(question)))
			.createdAt(recordedAt);
		withRival(answer, progress, false, deadline);
		return answer.build();
	}

	private static DuelAnswer.DuelAnswerBuilder baseAnswer(DuelProgress progress, DuelQuestion question) {
		return DuelAnswer.builder()
			.matchId(progress.match().getId())
			.position(progress.nextIndex())
			.questionId(question.id())
			.category(question.category());
	}

	private void withRival(DuelAnswer.DuelAnswerBuilder answer, DuelProgress progress, boolean playerCorrect,
			Instant playerAnsweredAt) {
		if (!progress.match().hasRival()) {
			return;
		}
		RivalAnswer rivalAnswer = rival.answer(progress, playerCorrect, playerAnsweredAt);
		answer.rivalCorrect(rivalAnswer.correct()).rivalAnswerAt(rivalAnswer.visibleAt());
	}

	private AnswerResultDto answerResult(DuelProgress progress, int index, List<DuelQuestion> questions) {
		DuelAnswer answer = progress.answer(index);
		DuelQuestionDto next = null;
		if (index + 1 < progress.questionCount()) {
			next = question(progress, index + 1, questions);
		}
		return answerMapper.toResultDto(answer, next, rival.snapshot(progress), scoring.yourFinal(progress),
				progress.match().isFinished());
	}

	/** The question the player has to answer now, or null once all are answered. */
	private DuelQuestionDto currentQuestion(DuelProgress progress, List<DuelQuestion> questions) {
		if (progress.isComplete()) {
			return null;
		}
		return question(progress, progress.nextIndex(), questions);
	}

	private DuelQuestionDto question(DuelProgress progress, int index, List<DuelQuestion> questions) {
		DuelQuestion question = questions.get(index);
		long timeLimitMs = timer.timeLimitMs(question);
		long deadline = progress.questionStart(index).toEpochMilli() + timeLimitMs;
		return questionConverter.toDto(progress.match().getId(), index, question, deadline, timeLimitMs);
	}

	private int questionCount() {
		return properties.questionsPerMatch();
	}

}
