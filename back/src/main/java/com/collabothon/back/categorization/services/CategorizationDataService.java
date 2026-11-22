package com.collabothon.back.categorization.services;

import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.categorization.repositories.CategorizationRepository;
import com.collabothon.back.categorization.repositories.ProfileAnswersRepository;
import com.collabothon.back.categorization.repositories.projections.ProfileAnswersProjection;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;

import lombok.RequiredArgsConstructor;

// A bean of its own, so that each statement gets a short transaction and none is open during the Jev call.
@Service
@RequiredArgsConstructor
public class CategorizationDataService {

	private final ProfileAnswersRepository profiles;
	private final CategorizationRepository categorizations;
	private final LessonCompletionRepository completions;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public Optional<ProfileAnswersProjection> findAnswers(String userId) {
		return profiles.findAnswers(userId);
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public Set<String> completedLessonIds(String userId) {
		return Set.copyOf(completions.findLessonIdsByUserId(userId));
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public Optional<String> findData(String userId) {
		return categorizations.findData(userId);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public boolean saveIfOnboarded(String userId, String data) {
		return categorizations.saveIfOnboarded(userId, data) == 1;
	}

}
