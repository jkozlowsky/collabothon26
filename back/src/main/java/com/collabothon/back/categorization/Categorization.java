package com.collabothon.back.categorization;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

public record Categorization(
		String userId,
		boolean consent,
		boolean bankData,
		Role role,
		LifeStage lifeStage,
		List<Area> focusAreas,
		List<ConfidenceGap> confidenceGaps,
		LessonVariant lessonVariant,
		List<Explanation> explanation,
		SharedWithModel sharedWithModel,
		Source source,
		String model,
		Instant categorizedAt) {

	public record ConfidenceGap(ConfidenceArea area, Direction direction, String because) {
	}

	public record LessonVariant(LifeStage persona, Level level, Lang lang) {
	}

	public record Explanation(Output output, Map<String, Double> probabilities, List<String> because) {
	}

	public record SharedWithModel(Facts facts, OnboardingAnswers answers) {
	}

	// Serialised verbatim to Jev, so a new component here is sent out too (pinned by a test).
	public record OnboardingAnswers(String lifeStage, List<String> goals, String experience, boolean skipped) {
	}

	public enum Role {

		NOVICE, INTERMEDIATE, ADVANCED;

		@JsonValue
		public String wire() {
			return wireName(this);
		}

	}

	@RequiredArgsConstructor
	public enum LifeStage {

		STUDENT("starting-out"), FAMILY("building"), ESTABLISHED("settled"), PRE_RETIREMENT("later-life");

		/** The onboarding answer (main's {@code user_profile.life_stage}) this stage comes from. */
		private final String answer;

		@JsonValue
		public String wire() {
			return wireName(this);
		}

		/** Null stays null; an unknown answer is an error, never a silent mapping. */
		static LifeStage fromAnswer(String answer) {
			return answer == null ? null : Arrays.stream(values())
				.filter(stage -> stage.answer.equals(answer))
				.findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Unknown life stage: " + answer));
		}

	}

	public enum ConfidenceArea {

		SAVING, INVESTING;

		@JsonValue
		public String wire() {
			return wireName(this);
		}

	}

	public enum Direction {

		UNDER, OVER;

		@JsonValue
		public String wire() {
			return wireName(this);
		}

	}

	public enum Level {

		BEGINNER, ADVANCED;

		@JsonValue
		public String wire() {
			return wireName(this);
		}

	}

	public enum Lang {

		PLAIN, STANDARD;

		@JsonValue
		public String wire() {
			return wireName(this);
		}

	}

	@RequiredArgsConstructor
	public enum Output {

		ROLE("role"), FOCUS_AREAS("focusAreas");

		private final String wire;

		// Not @Getter: that would be getWire(), unlike wire() on every other enum here.
		@JsonValue
		public String wire() {
			return wire;
		}

	}

	public enum Source {

		JEV, FALLBACK;

		@JsonValue
		public String wire() {
			return wireName(this);
		}

	}

	static String wireName(Enum<?> value) {
		return value.name().toLowerCase(Locale.ROOT).replace('_', '-');
	}

}
