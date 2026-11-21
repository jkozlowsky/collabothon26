package com.collabothon.back.lesson;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.dto.lesson.LessonSummary;
import com.collabothon.back.lesson.controllers.LessonController;
import com.collabothon.back.lesson.services.LessonResultService;
import com.collabothon.back.lesson.services.LessonService;

@WebMvcTest(LessonController.class)
class LessonControllerSliceTests {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private LessonService lessonService;

	@MockitoBean
	private LessonResultService resultService;

	@Test
	void listLessonsReturnsOk() throws Exception {
		LessonSummary summary = new LessonSummary("seoul-1", "seoul", "Hype", "Seoul", "Hype", 3, 50, "available");
		when(lessonService.getLessons("user1")).thenReturn(List.of(summary));

		mvc.perform(get("/api/lessons").param("userId", "user1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value("seoul-1"))
				.andExpect(jsonPath("$[0].status").value("available"));
	}
}
