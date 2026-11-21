package com.collabothon.back.lesson;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Per-user lesson progress (V4 tables). Plain SQL: the upserts are one statement each. */
@Repository
public class LessonProgress {

	private final JdbcClient jdbc;

	LessonProgress(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	public Set<String> completed(String userId) {
		if (userId == null) {
			return Set.of();
		}
		return new HashSet<>(jdbc.sql("SELECT lesson_id FROM lesson_completion WHERE user_id = ?")
			.param(userId)
			.query(String.class)
			.list());
	}

	/** Records the first completion with its XP. Returns false if the lesson was already completed. */
	boolean complete(String userId, String lessonId, int xp) {
		return jdbc.sql("""
				INSERT INTO lesson_completion (user_id, lesson_id, xp) VALUES (?, ?, ?)
				ON CONFLICT (user_id, lesson_id) DO NOTHING""").params(userId, lessonId, xp).update() == 1;
	}

	void recordActivity(String userId, LocalDate date) {
		jdbc.sql("INSERT INTO lesson_activity (user_id, completed_on) VALUES (?, ?) ON CONFLICT DO NOTHING")
			.params(userId, date).update();
	}

	int totalXp(String userId) {
		return jdbc.sql("SELECT COALESCE(SUM(xp), 0) FROM lesson_completion WHERE user_id = ?")
			.param(userId)
			.query(Integer.class)
			.single();
	}

	void recordConcept(String userId, String concept, boolean correctFirstTry) {
		jdbc.sql("""
				INSERT INTO concept_knowledge (user_id, concept, correct, attempts) VALUES (?, ?, ?, 1)
				ON CONFLICT (user_id, concept) DO UPDATE SET
				    correct = concept_knowledge.correct + EXCLUDED.correct,
				    attempts = concept_knowledge.attempts + 1""")
			.params(userId, concept, correctFirstTry ? 1 : 0)
			.update();
	}

	void recordScenarioChoice(String userId, String lessonId, String stepId, int choice) {
		jdbc.sql("INSERT INTO scenario_choice (user_id, lesson_id, step_id, choice) VALUES (?, ?, ?, ?)")
			.params(userId, lessonId, stepId, choice)
			.update();
	}

	/** The profile fields that pick lesson variants; empty when the user has no profile. */
	Optional<VariantProfile> variantProfile(String userId) {
		if (userId == null) {
			return Optional.empty();
		}
		return jdbc.sql("SELECT life_stage, experience FROM user_profile WHERE user_id = ?")
			.param(userId)
			.query((rs, n) -> new VariantProfile(rs.getString("life_stage"), rs.getString("experience")))
			.optional();
	}

	record VariantProfile(String lifeStage, String experience) {
	}

}
