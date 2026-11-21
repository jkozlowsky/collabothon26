package com.collabothon.back.entities.lesson;

import java.time.Instant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "scenario_choice")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScenarioChoice {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id")
	private Long id;

	@Column(name = "user_id", nullable = false, length = 64)
	private String userId;

	@Column(name = "lesson_id", nullable = false, length = 64)
	private String lessonId;

	@Column(name = "step_id", nullable = false, length = 64)
	private String stepId;

	@Column(name = "choice", nullable = false)
	private int choice;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Builder
	public ScenarioChoice(Long id, String userId, String lessonId, String stepId, int choice, Instant createdAt) {
		this.id = id;
		this.userId = userId;
		this.lessonId = lessonId;
		this.stepId = stepId;
		this.choice = choice;
		this.createdAt = createdAt;
	}
}
