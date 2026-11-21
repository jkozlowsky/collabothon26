package com.collabothon.back.categorization.controllers;

import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * A test's own bank: option 0 is right, options 1 and 2 carry "Thinks 1 <id>" and "Thinks 2 <id>". Call inside a
 * rolled-back test transaction.
 */
final class TestBank {

	private final JdbcClient jdbc;

	TestBank(JdbcClient jdbc) {
		this.jdbc = jdbc;
		jdbc.sql("DELETE FROM check_question").update();
	}

	long lesson(String title, String summary, int position) {
		return jdbc.sql("INSERT INTO lesson (position, emoji, title, summary, xp) VALUES (?, 'x', ?, ?, 10) RETURNING id")
			.params(position, title, summary)
			.query(Long.class)
			.single();
	}

	void question(String id, long lessonId, String area, String level) {
		jdbc.sql("""
				INSERT INTO check_question (id, lesson_id, area, level, account_prompt, slots, generic_prompt, options,
				                            correct_index, misconceptions, checks)
				VALUES (:id, :lesson, :area, :level, NULL, ARRAY[]::TEXT[], 'Prompt ' || :id,
				        ARRAY['Right', 'Wrong one', 'Wrong two'], 0,
				        ARRAY[NULL, 'Thinks 1 ' || :id, 'Thinks 2 ' || :id], 'Whether ' || :id)""")
			.param("id", id)
			.param("lesson", lessonId)
			.param("area", area)
			.param("level", level)
			.update();
	}

}
