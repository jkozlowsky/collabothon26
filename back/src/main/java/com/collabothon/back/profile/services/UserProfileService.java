package com.collabothon.back.profile.services;

import java.time.Clock;
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
import com.collabothon.back.profile.repositories.UserProfileRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserProfileService {

	private final UserProfileRepository profiles;
	private final UserProfileMapper mapper;
	private final StoryRepository stories;
	private final Clock clock;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public ProfileDto getProfile(String userId) {
		UserProfile profile = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
		return mapper.toDto(profile);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public ProfileDto saveOnboarding(String userId, OnboardingRequest req) {
		List<String> interests = req.interests().stream().distinct().toList();
		if (interests.stream().anyMatch(id -> stories.findById(id).isEmpty())) {
			throw new BusinessException(ProfileErrorCode.UNKNOWN_INTEREST);
		}
		UserProfile profile = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
		profile.completeOnboarding(req.lifeStage(), interests, req.experience(), req.skipped(), Instant.now());
		UserProfile saved = profiles.save(profile);
		return mapper.toDto(saved);
	}

	/** Remembers the lesson mode the user last switched to, so the next lesson opens in it. */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void saveLessonMode(String userId, String mode) {
		UserProfile profile = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
		profile.preferLessonMode(mode);
		profiles.save(profile);
	}

	/** The mode lessons open in; {@code video} for a user without a profile. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public String lessonMode(String userId) {
		if (userId == null) {
			return "video";
		}
		return profiles.findById(userId).map(UserProfile::getPreferredLessonMode).orElse("video");
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void resetOnboarding(String userId) {
		profiles.findById(userId).ifPresent(UserProfile::resetOnboarding);
	}

}
