package com.collabothon.back.lesson;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

@Entity
public class Lesson {

	@Id
	private Long id;

	private int position;

	private String emoji;

	private String title;

	private String summary;

	private int xp;

	@OneToMany(mappedBy = "lesson")
	@OrderBy("position")
	private List<Question> questions;

	protected Lesson() {
	}

	public Long getId() {
		return id;
	}

	public int getPosition() {
		return position;
	}

	public String getEmoji() {
		return emoji;
	}

	public String getTitle() {
		return title;
	}

	public String getSummary() {
		return summary;
	}

	public int getXp() {
		return xp;
	}

	public List<Question> getQuestions() {
		return questions;
	}

}
