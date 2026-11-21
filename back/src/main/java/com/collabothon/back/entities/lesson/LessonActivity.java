package com.collabothon.back.entities.lesson;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "lesson_activity")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LessonActivity {

	@EmbeddedId
	private LessonActivityId id;

	public LessonActivity(LessonActivityId id) {
		this.id = id;
	}
}
