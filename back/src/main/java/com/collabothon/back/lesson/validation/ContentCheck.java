package com.collabothon.back.lesson.validation;

record ContentCheck(
		String lesson,
		String location) {

	ContentCheck within(String part) {
		return new ContentCheck(lesson, location + part);
	}

	void require(boolean ok, String problem) {
		if (!ok) {
			throw new IllegalStateException("Lesson content '" + lesson + "': " + location + problem);
		}
	}

}
