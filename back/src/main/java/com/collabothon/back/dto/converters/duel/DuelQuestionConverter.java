package com.collabothon.back.dto.converters.duel;

import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.duel.DuelQuestionDto;
import com.collabothon.back.duel.consts.DuelStepConsts;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.duel.models.MatchPermutations;
import com.collabothon.back.duel.services.DuelShuffle;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** A step as played, without what gives the answer away, and as reviewed, in full plus the order it was shown in. */
@Component
public class DuelQuestionConverter {

	private static final Map<String, Set<String>> ANSWER_FIELDS_BY_TYPE = Map.of(
			DuelStepConsts.QUIZ, Set.of("correctIndex", "explanation"),
			DuelStepConsts.PREDICT, Set.of("answer", "reveal", "tolerance", "explanation"),
			DuelStepConsts.CHART, Set.of("answer", "tolerance", "explanation"));

	private static final Set<String> DEFAULT_ANSWER_FIELDS = Set.of("explanation");

	public DuelQuestionDto toDto(long matchId, int index, DuelQuestion question, long deadline, long timeLimitMs) {
		return new DuelQuestionDto(index, question.category(), toDuelStep(matchId, index, question.step()), deadline,
				timeLimitMs);
	}

	public ObjectNode toDuelStep(long matchId, int index, ObjectNode step) {
		String type = step.path("type").asString();
		return switch (type) {
			case DuelStepConsts.SORT -> toDuelSortStep(matchId, index, step);
			case DuelStepConsts.MATCH -> toDuelMatchStep(matchId, index, step);
			default -> withoutAnswers(type, step);
		};
	}

	public ObjectNode toReviewStep(long matchId, int index, ObjectNode step) {
		ObjectNode review = step.deepCopy();
		switch (review.path("type").asString()) {
			case DuelStepConsts.SORT ->
				addShownItems(review.putArray("shownItems"), matchId, index, review.path("items"));
			case DuelStepConsts.MATCH -> addShownPairs(review.putArray("shownLeft"), review.putArray("shownRight"),
					matchId, index, review.path("pairs"));
		}
		return review;
	}

	private static ObjectNode withoutAnswers(String type, ObjectNode step) {
		ObjectNode copy = step.deepCopy();
		copy.remove(ANSWER_FIELDS_BY_TYPE.getOrDefault(type, DEFAULT_ANSWER_FIELDS));
		return copy;
	}

	private static ObjectNode toDuelSortStep(long matchId, int index, ObjectNode step) {
		ObjectNode shown = stepHeader(DuelStepConsts.SORT, step);
		shown.set("buckets", step.path("buckets").deepCopy());
		addShownItems(shown.putArray("items"), matchId, index, step.path("items"));
		return shown;
	}

	private static ObjectNode toDuelMatchStep(long matchId, int index, ObjectNode step) {
		ObjectNode shown = stepHeader(DuelStepConsts.MATCH, step);
		addShownPairs(shown.putArray("left"), shown.putArray("right"), matchId, index, step.path("pairs"));
		return shown;
	}

	private static ObjectNode stepHeader(String type, ObjectNode step) {
		ObjectNode header = step.objectNode();
		header.put("type", type);
		header.put("id", step.path("id").asString());
		if (step.hasNonNull("prompt")) {
			header.put("prompt", step.path("prompt").asString());
		}
		return header;
	}

	private static void addShownItems(ArrayNode shown, long matchId, int index, JsonNode items) {
		for (int original : DuelShuffle.sortPermutation(matchId, index, items.size())) {
			shown.add(itemText(items.get(original)));
		}
	}

	private static void addShownPairs(ArrayNode left, ArrayNode right, long matchId, int index, JsonNode pairs) {
		MatchPermutations order = DuelShuffle.matchPermutations(matchId, index, pairs.size());
		for (int original : order.left()) {
			left.add(pairs.get(original).get(0).asString());
		}
		for (int original : order.right()) {
			right.add(pairs.get(original).get(1).asString());
		}
	}

	private static String itemText(JsonNode item) {
		if (item.isObject()) {
			return item.path("text").asString();
		}
		return item.asString();
	}

}
