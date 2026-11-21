package com.collabothon.back.lesson;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A decision taken in a scenario step. */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScenarioChoice {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String userId;

	private String lessonId;

	private String stepId;

	private int choice;

	@Column(insertable = false, updatable = false)
	private Instant createdAt;

	ScenarioChoice(String userId, String lessonId, String stepId, int choice) {
		this.userId = userId;
		this.lessonId = lessonId;
		this.stepId = stepId;
		this.choice = choice;
	}

}
