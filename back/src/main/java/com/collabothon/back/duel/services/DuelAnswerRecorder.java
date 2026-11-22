package com.collabothon.back.duel.services;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Component;

import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.entities.duel.AnswerOutcome;
import com.collabothon.back.entities.duel.ChosenAnswer;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelAnswer.DuelAnswerBuilder;

import lombok.RequiredArgsConstructor;

/** Writes answers and timeouts, each with the simulated rival's answer. Runs in the caller's transaction. */
@Component
@RequiredArgsConstructor
public class DuelAnswerRecorder {

	private final DuelAnswerRepository answers;

	private final DuelTimerCalculator timer;

	private final DuelStepGrader grader;

	private final DuelRivalSimulator rival;

	private final Clock clock;

	/** Records the next answer; one that comes after the deadline is a timeout and is not graded. */
	void recordAnswer(DuelProgress progress, DuelQuestion question, ChosenAnswer chosen) {
		Instant deadline = timer.deadline(question, progress.questionStart(progress.nextIndex()));
		Instant now = clock.instant();
		DuelAnswer answer;
		if (now.isAfter(deadline)) {
			answer = timeout(progress, question, deadline, now);
		}
		else {
			answer = graded(progress, question, chosen, now);
		}
		progress.add(answers.save(answer));
	}

	/** Timeouts are written lazily, the next time the match is read. */
	void recordTimeouts(DuelProgress progress, List<DuelQuestion> questions) {
		Instant now = clock.instant();
		while (!progress.getMatch().isFinished() && !progress.isComplete()) {
			int index = progress.nextIndex();
			DuelQuestion question = questions.get(index);
			Instant deadline = timer.deadline(question, progress.questionStart(index));
			if (!now.isAfter(deadline)) {
				return;
			}
			progress.add(answers.save(timeout(progress, question, deadline, deadline)));
		}
	}

	private DuelAnswer graded(DuelProgress progress, DuelQuestion question, ChosenAnswer chosen, Instant now) {
		int index = progress.nextIndex();
		Instant start = progress.questionStart(index);
		boolean correct = grader.grade(progress.getMatch().getId(), index, question, chosen);
		DuelAnswerBuilder answer = baseAnswer(progress, question)
			.chosenAnswer(chosen)
			.correct(correct)
			.outcome(AnswerOutcome.ANSWERED)
			.msTaken(Math.toIntExact(now.toEpochMilli() - start.toEpochMilli()))
			.createdAt(now);
		return withRival(answer, progress, correct, now).build();
	}

	private DuelAnswer timeout(DuelProgress progress, DuelQuestion question, Instant deadline, Instant recordedAt) {
		DuelAnswerBuilder answer = baseAnswer(progress, question)
			.correct(false)
			.outcome(AnswerOutcome.TIMEOUT)
			.msTaken(Math.toIntExact(timer.timeLimitMs(question)))
			.createdAt(recordedAt);
		return withRival(answer, progress, false, deadline).build();
	}

	private static DuelAnswerBuilder baseAnswer(DuelProgress progress, DuelQuestion question) {
		return DuelAnswer.builder()
			.matchId(progress.getMatch().getId())
			.position(progress.nextIndex())
			.questionId(question.id())
			.category(question.category());
	}

	private DuelAnswerBuilder withRival(DuelAnswerBuilder answer, DuelProgress progress, boolean playerCorrect,
			Instant playerAnsweredAt) {
		if (!progress.getMatch().hasSimulatedRival()) {
			return answer;
		}
		RivalAnswer rivalAnswer = rival.answer(progress, playerCorrect, playerAnsweredAt);
		return answer.rivalCorrect(rivalAnswer.correct()).rivalAnswerAt(rivalAnswer.visibleAt());
	}

}
