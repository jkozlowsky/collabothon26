package com.collabothon.back.profile;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
 * 404 on GET means the user has not been through onboarding yet.
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
		return profiles.findById(userId)
			.map(ProfileDto::from)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	/** Saves the onboarding answers (or that the user skipped them). Repeating it overwrites. */
	@PutMapping
	@Transactional
	ProfileDto saveOnboarding(@PathVariable String userId, @Valid @RequestBody OnboardingRequest req) {
		if (userId.isBlank() || userId.length() > 64) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid user id");
		}
		UserProfile profile = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
		Confidence c = req.confidence() == null ? new Confidence(null, null, null) : req.confidence();
		profile.completeOnboarding(req.lifeStage(), req.goals().stream().distinct().toList(), req.experience(),
				req.learningStyle(), c.budgeting(), c.saving(), c.investing(), req.skipped());
		return ProfileDto.from(profiles.save(profile));
	}

	/** Demo helper: forget the profile so onboarding shows again. */
	@DeleteMapping
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void reset(@PathVariable String userId) {
		profiles.deleteById(userId);
	}

	record OnboardingRequest(
			@Pattern(regexp = "student|family|established|pre-retirement") String lifeStage,
			@NotNull List<@NotNull @Pattern(regexp = GOALS) String> goals,
			@Pattern(regexp = "not-saving|none|tried|regular|experienced") String experience,
			@Pattern(regexp = "simple|detailed|visual|practice") String learningStyle,
			@Valid Confidence confidence,
			boolean skipped) {
	}

	/** Self-rated confidence per area, 1 = not at all, 5 = very. Each may be missing. */
	record Confidence(@Min(1) @Max(5) Short budgeting, @Min(1) @Max(5) Short saving,
			@Min(1) @Max(5) Short investing) {
	}

	private static final String GOALS = "budget|money-habits|banking-basics|start-saving|emergency-fund|big-purchase"
			+ "|buy-home|pay-off-debt|credit-cards|loans-mortgages|start-investing|stocks|etfs"
			+ "|bonds|diversification|sustainable-investing|crypto|inflation|risk|insurance"
			+ "|scams|taxes|kids-future|family-money|retirement";

	record ProfileDto(String userId, String lifeStage, List<String> goals, String experience, String learningStyle,
			Confidence confidence, boolean onboardingSkipped, Instant onboardingCompletedAt) {
		static ProfileDto from(UserProfile p) {
			return new ProfileDto(p.getUserId(), p.getLifeStage(), p.getGoals(), p.getExperience(),
					p.getLearningStyle(),
					new Confidence(p.getConfidenceBudgeting(), p.getConfidenceSaving(), p.getConfidenceInvesting()),
					p.isOnboardingSkipped(), p.getOnboardingCompletedAt());
		}
	}

}
