package com.collabothon.back.duel;

import java.util.List;

import com.collabothon.back.duel.DuelController.PlayerCardDto;
import com.collabothon.back.duel.DuelController.ReviewItemDto;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonSubTypes.Type;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Server-to-client frames on {@code /user/queue/duel}. Jackson writes the {@code type} discriminator, so the JSON
 * matches {@code ServerMessage} in {@code front/src/types/duel.ts}.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({ @Type(value = DuelMessage.QueueWaiting.class, name = "queue.waiting"),
		@Type(value = DuelMessage.QueueBotOffer.class, name = "queue.botOffer"),
		@Type(value = DuelMessage.MatchStart.class, name = "match.start"),
		@Type(value = DuelMessage.Question.class, name = "question"),
		@Type(value = DuelMessage.AnswerResult.class, name = "answer.result"),
		@Type(value = DuelMessage.RivalProgress.class, name = "rival.progress"),
		@Type(value = DuelMessage.MatchState.class, name = "match.state"),
		@Type(value = DuelMessage.MatchWaiting.class, name = "match.waiting"),
		@Type(value = DuelMessage.MatchEnd.class, name = "match.end"),
		@Type(value = DuelMessage.ErrorMessage.class, name = "error") })
sealed interface DuelMessage {

	record QueueWaiting(int elapsedSec, boolean widened) implements DuelMessage {
	}

	record QueueBotOffer() implements DuelMessage {
	}

	record MatchStart(long matchId, DuelMode mode, String category, PlayerCardDto you, PlayerCardDto rival,
			int questionCount) implements DuelMessage {
	}

	record Question(int index, String prompt, List<String> options, long deadline) implements DuelMessage {
	}

	record AnswerResult(int index, boolean correct, boolean timedOut) implements DuelMessage {
	}

	record RivalProgress(int answered, List<Boolean> results, boolean connected) implements DuelMessage {
	}

	record MatchState(long matchId, DuelMode mode, String category, PlayerCardDto you, PlayerCardDto rival,
			int questionCount, List<Boolean> yourResults, QuestionPayload question,
			RivalProgressPayload rivalProgress) implements DuelMessage {
	}

	record MatchWaiting() implements DuelMessage {
	}

	record MatchEnd(long matchId, DuelMode mode, String category, MatchOutcome outcome, int score, Integer rivalScore,
			PlayerCardDto rival, int xpGained, int levelBefore, int levelAfter, int xpIntoLevel, int xpForLevel,
			Integer eloBefore, Integer eloAfter, List<ReviewItemDto> review) implements DuelMessage {
	}

	record ErrorMessage(String code, String message) implements DuelMessage {
	}

	/** The question embedded in {@code match.state}. */
	record QuestionPayload(int index, String prompt, List<String> options, long deadline) {
	}

	/** The rival's progress embedded in {@code match.state}. */
	record RivalProgressPayload(int answered, List<Boolean> results, boolean connected) {
	}

}
