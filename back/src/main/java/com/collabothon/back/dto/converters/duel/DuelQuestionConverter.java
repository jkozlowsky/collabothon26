package com.collabothon.back.dto.converters.duel;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.duel.DuelQuestionDto;
import com.collabothon.back.duel.services.DuelShuffle;
import com.collabothon.back.entities.duel.DuelQuestion;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Turns a duel question into what the player sees before answering: the step without the fields that give the answer
 * away. The review sends the full step instead.
 */
@Component
public class DuelQuestionConverter {

	private static final String EXPLANATION = "explanation";

	private static final Map<String, Set<String>> ANSWER_FIELDS_BY_TYPE = Map.of(
			"quiz", Set.of("correctIndex", EXPLANATION),
			"predict", Set.of("answer", "reveal", "tolerance", EXPLANATION),
			"chart", Set.of("answer", "tolerance", EXPLANATION));

	private static final Set<String> DEFAULT_ANSWER_FIELDS = Set.of(EXPLANATION);

	public DuelQuestionDto toDto(long matchId, int index, DuelQuestion question, long deadline, long timeLimitMs) {
		return new DuelQuestionDto(index, question.category(), toDuelStep(matchId, index, question.step()), deadline,
				timeLimitMs);
	}

	public DuelQuestionDto toDto(int index, DuelQuestion question, long deadline, long timeLimitMs) {
		return toDto(0L, index, question, deadline, timeLimitMs);
	}

	public ObjectNode toDuelStep(long matchId, int index, ObjectNode step) {
		String type = step.path("type").asString();
		if ("sort".equals(type)) {
			return toDuelSortStep(matchId, index, step);
		}
		if ("match".equals(type)) {
			return toDuelMatchStep(matchId, index, step);
		}
		ObjectNode copy = step.deepCopy();
		copy.remove(ANSWER_FIELDS_BY_TYPE.getOrDefault(type, DEFAULT_ANSWER_FIELDS));
		return copy;
	}

	public ObjectNode withoutAnswerFields(ObjectNode step) {
		return toDuelStep(0L, 0, step);
	}

	private static ObjectNode toDuelSortStep(long matchId, int index, ObjectNode step) {
		ObjectNode duelStep = step.objectNode();
		duelStep.put("type", "sort");
		duelStep.put("id", step.path("id").asString());
		if (step.hasNonNull("prompt")) {
			duelStep.put("prompt", step.path("prompt").asString());
		}
		duelStep.set("buckets", step.path("buckets").deepCopy());
		ArrayNode itemsNode = duelStep.putArray("items");
		JsonNode origItems = step.path("items");
		List<Integer> perm = DuelShuffle.sortPermutation(matchId, index, origItems.size());
		for (int idx : perm) {
			JsonNode item = origItems.get(idx);
			itemsNode.add(extractItemText(item));
		}
		return duelStep;
	}

	private static ObjectNode toDuelMatchStep(long matchId, int index, ObjectNode step) {
		ObjectNode duelStep = step.objectNode();
		duelStep.put("type", "match");
		duelStep.put("id", step.path("id").asString());
		if (step.hasNonNull("prompt")) {
			duelStep.put("prompt", step.path("prompt").asString());
		}
		ArrayNode leftNode = duelStep.putArray("left");
		ArrayNode rightNode = duelStep.putArray("right");
		JsonNode origPairs = step.path("pairs");
		int size = origPairs.size();
		DuelShuffle.MatchPermutations perms = DuelShuffle.matchPermutations(matchId, index, size);
		for (int idx : perms.left()) {
			leftNode.add(origPairs.get(idx).get(0).asString());
		}
		for (int idx : perms.right()) {
			rightNode.add(origPairs.get(idx).get(1).asString());
		}
		return duelStep;
	}

	public ObjectNode toReviewStep(long matchId, int index, ObjectNode step) {
		ObjectNode copy = step.deepCopy();
		String type = copy.path("type").asString();
		if ("sort".equals(type)) {
			ArrayNode shownItems = copy.putArray("shownItems");
			JsonNode origItems = copy.path("items");
			List<Integer> perm = DuelShuffle.sortPermutation(matchId, index, origItems.size());
			for (int idx : perm) {
				JsonNode item = origItems.get(idx);
				shownItems.add(extractItemText(item));
			}
		}
		else if ("match".equals(type)) {
			ArrayNode shownLeft = copy.putArray("shownLeft");
			ArrayNode shownRight = copy.putArray("shownRight");
			JsonNode origPairs = copy.path("pairs");
			DuelShuffle.MatchPermutations perms = DuelShuffle.matchPermutations(matchId, index, origPairs.size());
			for (int idx : perms.left()) {
				shownLeft.add(origPairs.get(idx).get(0).asString());
			}
			for (int idx : perms.right()) {
				shownRight.add(origPairs.get(idx).get(1).asString());
			}
		}
		return copy;
	}

	private static String extractItemText(JsonNode item) {
		if (item.isObject()) {
			return item.path("text").asString();
		}
		return item.asString();
	}

}
