package com.collabothon.back.entities.lesson;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "lesson_completion")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LessonCompletion {

	@EmbeddedId
	private LessonCompletionId id;

	@Column(name = "completed_at", nullable = false)
	private Instant completedAt;

	@Column(name = "xp", nullable = false)
	private int xp;

}
