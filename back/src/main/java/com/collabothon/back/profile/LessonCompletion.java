package com.collabothon.back.profile;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

/** One finished lesson. {@code xp} is what this completion earned: the lesson's XP the first time, 0 for a repeat. */
@Entity
public class LessonCompletion {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String userId;

	private Long lessonId;

	/** The user's local date, as sent by the app. */
	private LocalDate completedOn;

	private int xp;

	protected LessonCompletion() {
	}

	LessonCompletion(String userId, Long lessonId, LocalDate completedOn, int xp) {
		this.userId = userId;
		this.lessonId = lessonId;
		this.completedOn = completedOn;
		this.xp = xp;
	}

	public Long getLessonId() {
		return lessonId;
	}

	public LocalDate getCompletedOn() {
		return completedOn;
	}

	public int getXp() {
		return xp;
	}

}
