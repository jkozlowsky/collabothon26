package com.collabothon.back.lesson;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class LessonControllerTests {

	@Autowired
	MockMvc mvc;

	@Test
	void listsSeededLessonsInOrder() throws Exception {
		mvc.perform(get("/api/lessons"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].title").value("Emergency fund"))
			.andExpect(jsonPath("$[0].questionCount").value(2));
	}

	@Test
	void returnsLessonWithQuestions() throws Exception {
		mvc.perform(get("/api/lessons/2"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.questions[0].options[1]").value("€1,210"))
			.andExpect(jsonPath("$.questions[0].correctIndex").value(1));
	}

	@Test
	void unknownLessonIs404() throws Exception {
		mvc.perform(get("/api/lessons/999")).andExpect(status().isNotFound());
	}

}
