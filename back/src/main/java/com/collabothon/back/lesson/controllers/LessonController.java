package com.collabothon.back.lesson.controllers;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.dto.lesson.LessonSummary;
import com.collabothon.back.dto.lesson.ResultRequest;
import com.collabothon.back.dto.lesson.ResultResponse;
import com.collabothon.back.lesson.services.LessonResultService;
import com.collabothon.back.lesson.services.LessonService;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.node.ObjectNode;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LessonController {

	private static final int MAX_USER_ID_LENGTH = 64;

	private final LessonService lessonService;

	private final LessonResultService resultService;

	@GetMapping("/stories")
	public ResponseEntity<List<ObjectNode>> stories(@RequestParam(required = false) String userId) {
		return ResponseEntity.ok(lessonService.getStories(userId));
	}

	@GetMapping("/lessons")
	public ResponseEntity<List<LessonSummary>> list(@RequestParam(required = false) String userId) {
		return ResponseEntity.ok(lessonService.getLessons(userId));
	}

	/** GET /api/lessons/{id}?userId= : the lesson personalised for the user, with both play orders. */
	@GetMapping("/lessons/{id}")
	public ResponseEntity<ObjectNode> get(@PathVariable String id, @RequestParam(required = false) String userId) {
		return ResponseEntity.ok(lessonService.getLesson(id, userId));
	}

	@PostMapping("/lessons/{id}/result")
	public ResponseEntity<ResultResponse> result(@PathVariable String id,
			@RequestParam @NotBlank @Size(max = MAX_USER_ID_LENGTH) String userId,
			@Valid @RequestBody ResultRequest req) {
		return ResponseEntity.ok(resultService.recordResult(id, userId, req));
	}

}
