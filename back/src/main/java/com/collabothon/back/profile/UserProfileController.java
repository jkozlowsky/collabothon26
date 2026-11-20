package com.collabothon.back.profile;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Profile of one user. The user id comes from the host banking app's session; there is no
 * login in Finance Quest itself (prototype: the id is passed in the path, not authenticated).
 * Every bank customer has a profile: one that was never saved comes back empty, with
 * {@code onboardingCompleted = false}.
 */
@RestController
@RequestMapping("/api/users/{userId}/profile")
class UserProfileController {

	private final UserProfileRepository profiles;

	UserProfileController(UserProfileRepository profiles) {
		this.profiles = profiles;
	}

	@GetMapping
	ProfileDto get(@PathVariable String userId) {
		return ProfileDto.from(profiles.findById(checked(userId)).orElseGet(() -> new UserProfile(userId)));
	}

	/**
	 * Saves the onboarding answers (or that the user skipped them) and marks onboarding as completed,
	 * so the app does not show it again. Repeating it overwrites the answers.
	 */
	@PutMapping("/onboarding")
	@Transactional
	ProfileDto saveOnboarding(@PathVariable String userId, @Valid @RequestBody OnboardingRequest req) {
		UserProfile profile = profiles.findById(checked(userId)).orElseGet(() -> new UserProfile(userId));
		profile.completeOnboarding(req.lifeStage(), req.goals().stream().distinct().toList(), req.experience(),
				req.skipped());
		return ProfileDto.from(profiles.save(profile));
	}

	/** Clears the onboarding answers and the completed flag so onboarding shows again (demo "restart"). */
	@DeleteMapping("/onboarding")
	@Transactional
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void resetOnboarding(@PathVariable String userId) {
		profiles.findById(checked(userId)).ifPresent(UserProfile::resetOnboarding);
	}

	private static String checked(String userId) {
		if (userId.isBlank() || userId.length() > 64) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid user id");
		}
		return userId;
	}

	record OnboardingRequest(
			@Pattern(regexp = "student|family|established|pre-retirement") String lifeStage,
			@NotNull List<@NotNull @Pattern(regexp = GOALS) String> goals,
			@Pattern(regexp = "not-saving|occasional|regular|investing|planning") String experience,
			boolean skipped) {
	}

	private static final String GOALS = "budget|money-habits|banking-basics|start-saving|emergency-fund|inflation"
			+ "|pay-off-debt|credit-cards|loans-mortgages|start-investing|stocks-etfs|crypto"
			+ "|retirement|insurance|scams";

	record ProfileDto(String userId, String lifeStage, List<String> goals, String experience,
			boolean onboardingCompleted, boolean onboardingSkipped, Instant onboardingCompletedAt) {
		static ProfileDto from(UserProfile p) {
			return new ProfileDto(p.getUserId(), p.getLifeStage(), p.getGoals(), p.getExperience(),
					p.isOnboardingCompleted(), p.isOnboardingSkipped(), p.getOnboardingCompletedAt());
		}
	}

}
