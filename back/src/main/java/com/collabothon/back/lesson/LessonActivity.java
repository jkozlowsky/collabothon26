package com.collabothon.back.lesson;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A day on which the user finished a lesson; the streak is built from these. */
@Entity
@IdClass(LessonActivityId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LessonActivity {

	@Id
	private String userId;

	@Id
	private LocalDate completedOn;

}
