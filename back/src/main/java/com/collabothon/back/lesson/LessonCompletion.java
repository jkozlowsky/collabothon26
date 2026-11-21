package com.collabothon.back.lesson;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** First completion of a lesson; XP is awarded once per lesson. */
@Entity
@IdClass(LessonCompletionId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LessonCompletion {

	@Id
	private String userId;

	@Id
	private String lessonId;

	@Column(insertable = false, updatable = false)
	private Instant completedAt;

	private int xp;

	public LessonCompletion(String userId, String lessonId, int xp) {
		this.userId = userId;
		this.lessonId = lessonId;
		this.xp = xp;
	}

}
