package com.collabothon.back.duel.live;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.collabothon.back.dto.duel.PlayerCardDto;

/** The server → client messages of the duel socket (spec duel-live §2). */
final class DuelSocketMessages {

	private DuelSocketMessages() {
	}

	static Map<String, Object> queued(long timeoutMs) {
		return message("queued", "timeoutMs", timeoutMs);
	}

	static Map<String, Object> matched(long matchId, PlayerCardDto rival, List<String> categories) {
		return message("matched", "matchId", matchId, "rival", rival, "categories", categories);
	}

	static Map<String, Object> noRival() {
		return message("no-rival");
	}

	static Map<String, Object> rivalProgress(long matchId, List<Boolean> results) {
		return message("rival-progress", "matchId", matchId, "answered", results.size(), "results", results);
	}

	static Map<String, Object> rivalFinished(long matchId, int rivalScore) {
		return message("rival-finished", "matchId", matchId, "rivalScore", rivalScore);
	}

	static Map<String, Object> rivalLeft(long matchId) {
		return message("rival-left", "matchId", matchId);
	}

	static Map<String, Object> pong() {
		return message("pong");
	}

	static Map<String, Object> error(String code) {
		return message("error", "code", code);
	}

	private static Map<String, Object> message(String type, Object... fields) {
		Map<String, Object> message = new LinkedHashMap<>();
		message.put("type", type);
		for (int i = 0; i < fields.length; i += 2) {
			message.put((String) fields[i], fields[i + 1]);
		}
		return message;
	}

}
