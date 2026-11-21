package com.collabothon.back.dto.converters.duel;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.collabothon.back.duel.services.DuelShuffle;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

class DuelQuestionConverterTests {

	private final DuelQuestionConverter converter = new DuelQuestionConverter();

	private final JsonMapper json = JsonMapper.builder().build();

	@Test
	void quizLosesCorrectIndexAndExplanation() {
		ObjectNode step = json.createObjectNode().put("type", "quiz").put("prompt", "p").put("correctIndex", 1)
			.put("explanation", "e");

		ObjectNode stripped = converter.withoutAnswerFields(step);

		assertThat(stripped.propertyNames()).containsExactlyInAnyOrder("type", "prompt");
		assertThat(step.has("correctIndex")).as("the content step is not modified").isTrue();
	}

	@Test
	void predictLosesAnswerRevealToleranceAndExplanation() {
		ObjectNode step = json.createObjectNode().put("type", "predict").put("answer", 1).put("reveal", "r")
			.put("tolerance", 1).put("explanation", "e");

		assertThat(converter.withoutAnswerFields(step).propertyNames()).containsExactly("type");
	}

	@Test
	void chartKeepsRevealButLosesAnswerToleranceAndExplanation() {
		ObjectNode step = json.createObjectNode().put("type", "chart").put("answer", 1).put("tolerance", 1)
			.put("explanation", "e").put("model", "leverage");

		assertThat(converter.withoutAnswerFields(step).propertyNames()).containsExactlyInAnyOrder("type", "model");
	}

	@Test
	void sortStepLosesExplanationAndItemBucketsAndShufflesItems() {
		ObjectNode step = json.createObjectNode().put("type", "sort").put("id", "s1").put("prompt", "Sort items")
			.put("explanation", "exp");
		ArrayNode buckets = step.putArray("buckets");
		buckets.add("B0").add("B1");
		ArrayNode items = step.putArray("items");
		items.addObject().put("text", "item 0").put("bucket", 0);
		items.addObject().put("text", "item 1").put("bucket", 1);
		items.addObject().put("text", "item 2").put("bucket", 0);
		items.addObject().put("text", "item 3").put("bucket", 1);

		long matchId = 42L;
		int index = 4;
		ObjectNode duelStep = converter.toDuelStep(matchId, index, step);

		assertThat(duelStep.propertyNames()).containsExactlyInAnyOrder("type", "id", "prompt", "buckets", "items");
		assertThat(duelStep.path("type").asString()).isEqualTo("sort");
		assertThat(duelStep.path("id").asString()).isEqualTo("s1");
		assertThat(duelStep.path("prompt").asString()).isEqualTo("Sort items");
		assertThat(duelStep.path("explanation").isMissingNode()).isTrue();

		// items must be string[]
		JsonNode shownItems = duelStep.path("items");
		assertThat(shownItems.isArray()).isTrue();
		assertThat(shownItems.size()).isEqualTo(4);
		List<String> shownList = new ArrayList<>();
		for (JsonNode item : shownItems) {
			assertThat(item.isTextual()).isTrue();
			shownList.add(item.asString());
		}

		List<Integer> perm = DuelShuffle.sortPermutation(matchId, index, 4);
		List<String> expectedShuffled = perm.stream()
			.map(idx -> "item " + idx)
			.toList();
		assertThat(shownList).isEqualTo(expectedShuffled);
	}

	@Test
	void matchStepLosesExplanationAndPairsAndProducesShuffledLeftAndRightColumns() {
		ObjectNode step = json.createObjectNode().put("type", "match").put("id", "m1").put("prompt", "Match pairs")
			.put("explanation", "exp");
		ArrayNode pairs = step.putArray("pairs");
		pairs.addArray().add("L0").add("R0");
		pairs.addArray().add("L1").add("R1");
		pairs.addArray().add("L2").add("R2");
		pairs.addArray().add("L3").add("R3");

		long matchId = 77L;
		int index = 5;
		ObjectNode duelStep = converter.toDuelStep(matchId, index, step);

		assertThat(duelStep.propertyNames()).containsExactlyInAnyOrder("type", "id", "prompt", "left", "right");
		assertThat(duelStep.path("pairs").isMissingNode()).isTrue();
		assertThat(duelStep.path("explanation").isMissingNode()).isTrue();

		DuelShuffle.MatchPermutations perms = DuelShuffle.matchPermutations(matchId, index, 4);
		List<String> expectedLeft = perms.left().stream().map(idx -> "L" + idx).toList();
		List<String> expectedRight = perms.right().stream().map(idx -> "R" + idx).toList();

		List<String> actualLeft = new ArrayList<>();
		duelStep.path("left").forEach(node -> actualLeft.add(node.asString()));
		List<String> actualRight = new ArrayList<>();
		duelStep.path("right").forEach(node -> actualRight.add(node.asString()));

		assertThat(actualLeft).isEqualTo(expectedLeft);
		assertThat(actualRight).isEqualTo(expectedRight);
	}

	@Test
	void reviewStepRetainsOriginalFieldsAndCarriesShownOrderForSortAndMatch() {
		long matchId = 123L;
		int sortIndex = 4;
		int matchIndex = 5;

		// Sort review step
		ObjectNode sortStep = json.createObjectNode().put("type", "sort").put("id", "s1").put("explanation", "sortExp");
		sortStep.putArray("buckets").add("B0").add("B1");
		ArrayNode sortItems = sortStep.putArray("items");
		sortItems.addObject().put("text", "T0").put("bucket", 0);
		sortItems.addObject().put("text", "T1").put("bucket", 1);

		ObjectNode sortReview = converter.toReviewStep(matchId, sortIndex, sortStep);
		assertThat(sortReview.has("items")).isTrue();
		assertThat(sortReview.has("explanation")).isTrue();
		assertThat(sortReview.has("shownItems")).isTrue();
		assertThat(sortReview.path("shownItems").size()).isEqualTo(2);

		List<Integer> sortPerm = DuelShuffle.sortPermutation(matchId, sortIndex, 2);
		assertThat(sortReview.path("shownItems").get(0).asString()).isEqualTo("T" + sortPerm.get(0));
		assertThat(sortReview.path("shownItems").get(1).asString()).isEqualTo("T" + sortPerm.get(1));

		// Match review step
		ObjectNode matchStep = json.createObjectNode().put("type", "match").put("id", "m1").put("explanation", "matchExp");
		ArrayNode matchPairs = matchStep.putArray("pairs");
		matchPairs.addArray().add("L0").add("R0");
		matchPairs.addArray().add("L1").add("R1");

		ObjectNode matchReview = converter.toReviewStep(matchId, matchIndex, matchStep);
		assertThat(matchReview.has("pairs")).isTrue();
		assertThat(matchReview.has("explanation")).isTrue();
		assertThat(matchReview.has("shownLeft")).isTrue();
		assertThat(matchReview.has("shownRight")).isTrue();

		DuelShuffle.MatchPermutations matchPerms = DuelShuffle.matchPermutations(matchId, matchIndex, 2);
		assertThat(matchReview.path("shownLeft").get(0).asString()).isEqualTo("L" + matchPerms.left().get(0));
		assertThat(matchReview.path("shownRight").get(0).asString()).isEqualTo("R" + matchPerms.right().get(0));
	}

}
