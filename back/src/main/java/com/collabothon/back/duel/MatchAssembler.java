package com.collabothon.back.duel;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.collabothon.back.duel.DuelPersistenceService.PlayerProgression;
import com.collabothon.back.duel.QuestionSelectionService.QuestionView;
import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

/** Builds the domain views of a match (live or persisted) that the mappers turn into DTOs and frames. */
final class MatchAssembler {

	private MatchAssembler() {
	}

	/** The match as one of its players sees it. */
	record MatchView(long matchId, DuelMode mode, String category, PlayerCard you, PlayerCard rival,
			int questionCount) {
	}

	record LiveQuestion(int index, String prompt, List<String> options, long deadline) {
	}

	record RivalSnapshot(int answered, List<Boolean> results, boolean connected) {
	}

	/** Everything {@code match.state} carries for a reconnecting player. */
	record MatchStateView(MatchView match, List<Boolean> yourResults, LiveQuestion question,
			RivalSnapshot rivalProgress) {
	}

	record ReviewEntry(QuestionView question, Integer yourOption) {
	}

	record MatchResult(long matchId, DuelMode mode, String category, int score, Integer rivalScore, PlayerCard rival,
			PlayerProgression progression, List<ReviewEntry> review) {
	}

	static MatchView view(ActiveMatch match, PlayerSlot player) {
		PlayerSlot rival = match.rivalOf(player);
		return new MatchView(match.getMatchId(), match.getMode(), match.getCategory().getSlug(), player.getCard(),
				rival != null ? rival.getCard() : null, match.getQuestions().size());
	}

	/** The question the player has to answer next, or null when they have answered all of them. */
	static LiveQuestion currentQuestion(ActiveMatch match, PlayerSlot player) {
		int index = player.getCurrentIndex();
		if (player.isFinished() || index >= match.getQuestions().size()) {
			return null;
		}
		return question(match, player, index);
	}

	static LiveQuestion question(ActiveMatch match, PlayerSlot player, int index) {
		QuestionView view = match.getQuestions().get(index).view(player.getLang());
		return new LiveQuestion(index, view.prompt(), view.options(), player.getQuestionDeadline());
	}

	static RivalSnapshot snapshot(PlayerSlot slot) {
		return new RivalSnapshot(slot.getAnswered(), slot.resultsCopy(), slot.isConnected());
	}

	static MatchStateView state(ActiveMatch match, PlayerSlot player) {
		PlayerSlot rival = match.rivalOf(player);
		return new MatchStateView(view(match, player), player.resultsCopy(), currentQuestion(match, player),
				rival != null ? snapshot(rival) : null);
	}

	/** The rival's card after the match: new level and Elo for a human, unchanged for a bot. */
	static PlayerCard postMatchRival(PlayerSlot rival, PlayerProgression rivalProgression) {
		if (rival == null) {
			return null;
		}
		if (rival.isBot() || rivalProgression == null) {
			return rival.getCard();
		}
		PlayerCard card = rival.getCard();
		return new PlayerCard(card.name(), rivalProgression.levelAfter(), rivalProgression.eloAfter(), card.avatar(),
				false);
	}

	static MatchResult liveResult(ActiveMatch match, PlayerSlot player, Integer rivalScore, PlayerCard rival,
			PlayerProgression progression) {
		List<ReviewEntry> review = new ArrayList<>(match.getQuestions().size());
		for (int i = 0; i < match.getQuestions().size(); i++) {
			QuestionView view = match.getQuestions().get(i).view(player.getLang());
			review.add(new ReviewEntry(view, player.getChosenDisplayOptions()[i]));
		}
		return new MatchResult(match.getMatchId(), match.getMode(), match.getCategory().getSlug(), player.getScore(),
				rivalScore, rival, progression, review);
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
