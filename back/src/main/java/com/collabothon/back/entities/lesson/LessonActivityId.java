package com.collabothon.back.entities.lesson;

import java.io.Serializable;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import com.collabothon.back.common.consts.UserConsts;

@Embeddable
public record LessonActivityId(
		@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
		String userId,
		@Column(name = "completed_on", nullable = false)
		LocalDate completedOn) implements Serializable {}
