package com.collabothon.back.entities.lesson;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import com.collabothon.back.common.consts.UserConsts;
import com.collabothon.back.lesson.consts.LessonConsts;

@Embeddable
public record ConceptKnowledgeId(
		@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
		String userId,
		@Column(name = "concept", nullable = false, length = LessonConsts.MAX_ID_LENGTH)
		String concept) implements Serializable {}
