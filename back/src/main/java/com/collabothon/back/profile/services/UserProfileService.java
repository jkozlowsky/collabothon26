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
import com.collabothon.back.profile.repositories.UserProfileRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserProfileService {

	private final UserProfileRepository profiles;
	private final UserProfileMapper mapper;
	private final Clock clock;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public ProfileDto getProfile(String userId) {
		UserProfile profile = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
		return mapper.toDto(profile);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public ProfileDto saveOnboarding(String userId, OnboardingRequest req) {
		UserProfile profile = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
		List<String> distinctGoals = req.goals().stream().distinct().toList();
		profile.completeOnboarding(req.lifeStage(), distinctGoals, req.experience(), req.skipped(), Instant.now());
		UserProfile saved = profiles.save(profile);
		return mapper.toDto(saved);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void resetOnboarding(String userId) {
		profiles.findById(userId).ifPresent(UserProfile::resetOnboarding);
	}

}
