package com.collabothon.back.profile.services;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.profile.UserProfileMapper;
import com.collabothon.back.dto.profile.OnboardingRequest;
import com.collabothon.back.dto.profile.ProfileDto;
import com.collabothon.back.entities.profile.UserProfile;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.profile.consts.ProfileConsts;
import com.collabothon.back.profile.repositories.UserProfileRepository;

import lombok.RequiredArgsConstructor;

// lessonMode is REQUIRED: LessonService calls it inside its transaction and must not need a second connection.
@Service
@RequiredArgsConstructor
public class UserProfileService {

	private final UserProfileRepository profiles;
	private final UserProfileMapper mapper;
	private final StoryRepository stories;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public ProfileDto getProfile(String userId) {
		return mapper.toDto(profileOrNew(userId));
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public ProfileDto saveOnboarding(String userId, OnboardingRequest req) {
		List<String> interests = req.interests().stream().distinct().toList();
		if (interests.stream().anyMatch(id -> stories.findById(id).isEmpty())) {
			throw new BusinessException(ProfileErrorCode.UNKNOWN_INTEREST);
		}
		UserProfile profile = profileOrNew(userId);
		// Not the injected Clock: the V17 trigger forgets the categorisation only if this instant changes.
		profile.completeOnboarding(req.lifeStage(), interests, req.experience(), req.skipped(), Instant.now());
		UserProfile saved = profiles.save(profile);
		return mapper.toDto(saved);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public void saveLessonMode(String userId, String mode) {
		UserProfile profile = profileOrNew(userId);
		profile.preferLessonMode(mode);
		profiles.save(profile);
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public String lessonMode(String userId) {
		if (userId == null) {
			return ProfileConsts.LESSON_MODE_VIDEO;
		}
		return profileOrNew(userId).getPreferredLessonMode();
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public void resetOnboarding(String userId) {
		profiles.findById(userId).ifPresent(UserProfile::resetOnboarding);
	}

	private UserProfile profileOrNew(String userId) {
		return profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
	}

}
