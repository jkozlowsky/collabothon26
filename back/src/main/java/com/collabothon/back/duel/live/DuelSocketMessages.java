package com.collabothon.back.duel.live;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.collabothon.back.dto.duel.PlayerCardDto;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** The server to client messages of the duel socket; the field order is the JSON order. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
final class DuelSocketMessages {

	static Map<String, Object> queued(long timeoutMs) {
		Map<String, Object> message = message("queued");
		message.put("timeoutMs", timeoutMs);
		return message;
	}

	static Map<String, Object> matched(long matchId, PlayerCardDto rival, List<String> categories) {
		Map<String, Object> message = matchMessage("matched", matchId);
		message.put("rival", rival);
		message.put("categories", categories);
		return message;
	}

	static Map<String, Object> noRival() {
		return message("no-rival");
	}

	static Map<String, Object> rivalProgress(long matchId, List<Boolean> results) {
		Map<String, Object> message = matchMessage("rival-progress", matchId);
		message.put("answered", results.size());
		message.put("results", results);
		return message;
	}

	static Map<String, Object> rivalFinished(long matchId, int rivalScore) {
		Map<String, Object> message = matchMessage("rival-finished", matchId);
		message.put("rivalScore", rivalScore);
		return message;
	}

	static Map<String, Object> rivalLeft(long matchId) {
		return matchMessage("rival-left", matchId);
	}

	static Map<String, Object> pong() {
		return message("pong");
	}

	static Map<String, Object> error(String code) {
		Map<String, Object> message = message("error");
		message.put("code", code);
		return message;
	}

	private static Map<String, Object> matchMessage(String type, long matchId) {
		Map<String, Object> message = message(type);
		message.put("matchId", matchId);
		return message;
	}

	private static Map<String, Object> message(String type) {
		Map<String, Object> message = new LinkedHashMap<>();
		message.put("type", type);
		return message;
	}

}
