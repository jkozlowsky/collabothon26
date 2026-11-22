package com.collabothon.back.lesson.controllers;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.common.validation.OptionalUserId;
import com.collabothon.back.common.validation.UserId;
import com.collabothon.back.dto.lesson.LessonSummary;
import com.collabothon.back.dto.lesson.ResultRequest;
import com.collabothon.back.dto.lesson.ResultResponse;
import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.services.LessonResultService;
import com.collabothon.back.lesson.services.LessonService;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.node.ObjectNode;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LessonController {

	private final LessonService lessonService;

	private final LessonResultService resultService;

	@GetMapping("/stories")
	public ResponseEntity<List<ObjectNode>> stories(@RequestParam(required = false) @OptionalUserId String userId) {
		return ResponseEntity.ok(lessonService.getStories(userId));
	}

	@GetMapping("/lessons")
	public ResponseEntity<List<LessonSummary>> list(@RequestParam(required = false) @OptionalUserId String userId) {
		return ResponseEntity.ok(lessonService.getLessons(userId));
	}

	@GetMapping("/lessons/{id}")
	public ResponseEntity<ObjectNode> get(@PathVariable @Size(max = LessonConsts.MAX_ID_LENGTH) String id,
			@RequestParam(required = false) @OptionalUserId String userId) {
		return ResponseEntity.ok(lessonService.getLesson(id, userId));
	}

	@PostMapping("/lessons/{id}/result")
	public ResponseEntity<ResultResponse> result(@PathVariable @Size(max = LessonConsts.MAX_ID_LENGTH) String id,
			@RequestParam @UserId String userId,
			@Valid @RequestBody ResultRequest request) {
		return ResponseEntity.ok(resultService.recordResult(id, userId, request));
	}

}
