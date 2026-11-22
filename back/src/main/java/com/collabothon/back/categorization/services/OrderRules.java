package com.collabothon.back.categorization.services;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.models.CheckLesson;
import com.collabothon.back.categorization.models.CheckQuestion;
import com.collabothon.back.lesson.models.Story;

final class OrderRules {

	static List<Story> picked(List<String> storyIds, List<Story> stories) {
		return storyIds.stream().flatMap(id -> stories.stream().filter(story -> story.id().equals(id))).toList();
	}

	static List<FocusArea> areasOf(List<Story> picked) {
		return picked.stream().map(story -> FocusArea.ofStoryArea(story.area())).distinct().toList();
	}

	static List<FocusArea> areaOrder(List<FocusArea> interests, String horizon, List<CheckQuestion> pool) {
		Set<FocusArea> preferred = new LinkedHashSet<>(interests);
		preferred.addAll(Arrays.asList(FocusArea.values()));
		List<FocusArea> order = preferred.stream()
			.filter(area -> pool.stream().anyMatch(question -> question.area() == area))
			.toList();
		if (!CategorizationConsts.HORIZON_WITHIN_1Y.equals(horizon)) {
			return order;
		}
		return savingBeforeInvesting(order);
	}

	private static List<FocusArea> savingBeforeInvesting(List<FocusArea> order) {
		int investing = order.indexOf(FocusArea.INVESTING);
		if (investing < 0 || order.indexOf(FocusArea.SAVING) < investing) {
			return order;
		}
		List<FocusArea> moved = new ArrayList<>(order);
		moved.remove(FocusArea.SAVING);
		moved.add(investing, FocusArea.SAVING);
		return moved;
	}

	// The sort is stable, so a story keeps its own order.
	static List<CheckQuestion> pickedFirst(List<CheckQuestion> pool, List<Story> picked) {
		return pool.stream().sorted(Comparator.comparingInt(question -> pickRank(picked, question.storyId()))).toList();
	}

	// Stories not picked share the place after the picks.
	static int pickRank(List<Story> picked, String storyId) {
		return IntStream.range(0, picked.size())
			.filter(i -> picked.get(i).id().equals(storyId))
			.findFirst()
			.orElse(picked.size());
	}

	static List<CheckLesson> lessons(List<CheckQuestion> questions) {
		return questions.stream().map(CheckQuestion::lesson).distinct().toList();
	}

	// Each story's first lesson before any story's second, so a short choice spans the area's stories.
	static List<CheckLesson> acrossStories(List<CheckLesson> lessons) {
		return lessons.stream().sorted(Comparator.comparingLong(lesson -> placeInStory(lesson, lessons))).toList();
	}

	private static long placeInStory(CheckLesson lesson, List<CheckLesson> lessons) {
		return lessons.stream()
			.takeWhile(other -> !other.id().equals(lesson.id()))
			.filter(other -> other.storyId().equals(lesson.storyId()))
			.count();
	}

}
