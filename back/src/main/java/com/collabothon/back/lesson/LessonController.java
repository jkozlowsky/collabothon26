package com.collabothon.back.lesson;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/lessons")
class LessonController {

	private final LessonRepository lessons;

	LessonController(LessonRepository lessons) {
		this.lessons = lessons;
	}

	@GetMapping
	List<LessonSummary> list() {
		return lessons.findAllByOrderByPosition().stream().map(LessonSummary::from).toList();
	}

	@GetMapping("/{id}")
	LessonDetail get(@PathVariable Long id) {
		return lessons.findWithQuestionsById(id)
			.map(LessonDetail::from)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	record LessonSummary(Long id, String emoji, String title, String summary, int xp, int questionCount) {
		static LessonSummary from(Lesson l) {
			return new LessonSummary(l.getId(), l.getEmoji(), l.getTitle(), l.getSummary(), l.getXp(),
					l.getQuestions().size());
		}
	}

	// Prototype shortcut: correctIndex goes to the client, which checks answers itself.
	record LessonDetail(Long id, String emoji, String title, String summary, int xp, List<QuestionDto> questions) {
		static LessonDetail from(Lesson l) {
			return new LessonDetail(l.getId(), l.getEmoji(), l.getTitle(), l.getSummary(), l.getXp(),
					l.getQuestions().stream().map(QuestionDto::from).toList());
		}
	}

	record QuestionDto(Long id, String prompt, List<String> options, int correctIndex, String explanation) {
		static QuestionDto from(Question q) {
			return new QuestionDto(q.getId(), q.getPrompt(), q.getOptions(), q.getCorrectIndex(), q.getExplanation());
		}
	}

}
