package com.collabothon.back.profile;

import java.time.Instant;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** A user's profile, keyed by the bank's customer id. Holds the onboarding answers for now. */
@Entity
public class UserProfile {

	@Id
	private String userId;

	private String lifeStage;

	/** Postgres text[]; Hibernate maps List<String> to a native array. */
	private List<String> goals;

	private String experience;

	/** True once the user finished or skipped onboarding; it is then not shown again. */
	private boolean onboardingCompleted;

	private boolean onboardingSkipped;

	private Instant onboardingCompletedAt;

	protected UserProfile() {
	}

	UserProfile(String userId) {
		this.userId = userId;
		this.goals = List.of();
	}

	void completeOnboarding(String lifeStage, List<String> goals, String experience, boolean skipped) {
		this.lifeStage = lifeStage;
		this.goals = List.copyOf(goals);
		this.experience = experience;
		this.onboardingSkipped = skipped;
		this.onboardingCompleted = true;
		this.onboardingCompletedAt = Instant.now();
	}

	/** Forget the onboarding answers so onboarding shows again. Other profile data stays. */
	void resetOnboarding() {
		this.lifeStage = null;
		this.goals = List.of();
		this.experience = null;
		this.onboardingSkipped = false;
		this.onboardingCompleted = false;
		this.onboardingCompletedAt = null;
	}

	public String getUserId() {
		return userId;
	}

	public String getLifeStage() {
		return lifeStage;
	}

	public List<String> getGoals() {
		return goals;
	}

	public String getExperience() {
		return experience;
	}

	public boolean isOnboardingCompleted() {
		return onboardingCompleted;
	}

	public boolean isOnboardingSkipped() {
		return onboardingSkipped;
	}

	public Instant getOnboardingCompletedAt() {
		return onboardingCompletedAt;
	}

}
