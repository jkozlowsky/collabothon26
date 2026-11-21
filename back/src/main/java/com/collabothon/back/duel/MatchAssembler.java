package com.collabothon.back.duel;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.collabothon.back.duel.DuelPersistenceService.PlayerProgression;
import com.collabothon.back.duel.QuestionSelectionService.QuestionView;
import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

/** Builds the domain views of a match (live or persisted) that the mappers turn into DTOs. */
final class MatchAssembler {

	private MatchAssembler() {
	}

		record LiveQuestion(int index, String prompt, List<String> options, long deadline) {
	}

	/** The rival's answers so far; {@code connected} is always true, a simulated rival never drops off. */
	record RivalSnapshot(int answered, List<Boolean> results, boolean connected) {
	}

	/** What starting a match returns: the match as the player sees it plus the first question. */
	record StartView(long matchId, DuelMode mode, String category, PlayerCard you, PlayerCard rival,
			int questionCount, LiveQuestion question) {
	}

	/** The reply to an answer; {@code nextQuestion} is null once the player has answered everything. */
	record AnswerOutcome(int index, boolean correct, boolean timedOut, LiveQuestion nextQuestion,
			RivalSnapshot rivalProgress, boolean finished) {
	}

	/** A snapshot of the match for a reloading or polling client. */
	record MatchStateView(long matchId, DuelMode mode, String category, PlayerCard you, PlayerCard rival,
			int questionCount, List<Boolean> yourResults, LiveQuestion question, RivalSnapshot rivalProgress,
			boolean finished) {
	}

	record ReviewEntry(QuestionView question, Integer yourOption) {
	}

	record MatchResult(long matchId, DuelMode mode, String category, int score, Integer rivalScore, PlayerCard rival,
			PlayerProgression progression, List<ReviewEntry> review) {
	}

	/** The question the player has to answer next, or null when they have answered all of them. */
	static LiveQuestion currentQuestion(ActiveMatch match) {
		return match.isFinished() ? null : question(match, match.getCurrentIndex());
	}

	static LiveQuestion question(ActiveMatch match, int index) {
		QuestionView view = match.getQuestions().get(index).view(match.getLang());
		return new LiveQuestion(index, view.prompt(), view.options(), match.getQuestionDeadline());
	}

	/** The rival's answers {@code now}; null in a solo match. */
	static RivalSnapshot rivalSnapshot(ActiveMatch match, long now) {
		RivalPlan rival = match.getRival();
		if (rival == null) {
			return null;
		}
		int answered = rival.answeredBy(now - match.getStartedAtMs());
		List<Boolean> results = new ArrayList<>(rival.questionCount());
		for (int i = 0; i < rival.questionCount(); i++) {
			results.add(i < answered ? rival.correct()[i] : null);
		}
		return new RivalSnapshot(answered, results, true);
	}

	static StartView start(ActiveMatch match) {
		return new StartView(match.getMatchId(), match.getMode(), match.getCategory().getSlug(), match.getYou(),
				match.getRivalCard(), match.getQuestions().size(), currentQuestion(match));
	}

	static MatchStateView state(ActiveMatch match, long now) {
		return new MatchStateView(match.getMatchId(), match.getMode(), match.getCategory().getSlug(), match.getYou(),
				match.getRivalCard(), match.getQuestions().size(), match.resultsCopy(), currentQuestion(match),
				rivalSnapshot(match, now), match.isEnded());
	}

	/** Rebuilds the review of a finished match from its stored slots and the player's stored answers. */
	static List<ReviewEntry> storedReview(List<DuelMatchQuestion> slots, Map<Long, DuelQuestion> questions,
			Map<Integer, DuelAnswer> answersByPosition, DuelLang lang) {
		List<ReviewEntry> review = new ArrayList<>(slots.size());
		for (DuelMatchQuestion slot : slots) {
			DuelQuestion question = questions.get(slot.getQuestionId());
			if (question == null) {
				continue;
			}
			DuelAnswer answer = answersByPosition.get(slot.getPosition());
			Integer yourOption = answer != null && answer.getChosenIndex() != null
					? slot.getOptionOrder().indexOf(answer.getChosenIndex()) : null;
			review.add(new ReviewEntry(new SelectedQuestion(question, slot.getOptionOrder()).view(lang), yourOption));
		}
		return review;
	}

}
