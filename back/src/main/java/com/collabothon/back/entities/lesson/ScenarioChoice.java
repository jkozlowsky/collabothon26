package com.collabothon.back.entities.lesson;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.collabothon.back.common.consts.UserConsts;
import com.collabothon.back.lesson.consts.LessonConsts;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "scenario_choice")
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScenarioChoice {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id")
	private Long id;

	@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
	private String userId;

	@Column(name = "lesson_id", nullable = false, length = LessonConsts.MAX_ID_LENGTH)
	private String lessonId;

	@Column(name = "step_id", nullable = false, length = LessonConsts.MAX_ID_LENGTH)
	private String stepId;

	@Column(name = "choice", nullable = false)
	private int choice;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

}
