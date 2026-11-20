package com.collabothon.back.lesson;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class Question {

	@Id
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "lesson_id")
	private Lesson lesson;

	private int position;

	private String prompt;

	/** Postgres text[]; Hibernate maps List<String> to a native array. */
	private List<String> options;

	private int correctIndex;

	private String explanation;

	protected Question() {
	}

	public Long getId() {
		return id;
	}

	public String getPrompt() {
		return prompt;
	}

	public List<String> getOptions() {
		return options;
	}

	public int getCorrectIndex() {
		return correctIndex;
	}

	public String getExplanation() {
		return explanation;
	}

}
