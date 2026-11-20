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

	private String learningStyle;

	/** Self-rated confidence, 1-5, per area. Asked in onboarding and again after lessons. */
	private Short confidenceBudgeting;

	private Short confidenceSaving;

	private Short confidenceInvesting;

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

	void completeOnboarding(String lifeStage, List<String> goals, String experience, String learningStyle,
			Short confidenceBudgeting, Short confidenceSaving, Short confidenceInvesting, boolean skipped) {
		this.lifeStage = lifeStage;
		this.goals = List.copyOf(goals);
		this.experience = experience;
		this.learningStyle = learningStyle;
		this.confidenceBudgeting = confidenceBudgeting;
		this.confidenceSaving = confidenceSaving;
		this.confidenceInvesting = confidenceInvesting;
		this.onboardingSkipped = skipped;
		this.onboardingCompleted = true;
		this.onboardingCompletedAt = Instant.now();
	}

	/** Forget the onboarding answers so onboarding shows again. Other profile data stays. */
	void resetOnboarding() {
		this.lifeStage = null;
		this.goals = List.of();
		this.experience = null;
		this.learningStyle = null;
		this.confidenceBudgeting = null;
		this.confidenceSaving = null;
		this.confidenceInvesting = null;
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

	public String getLearningStyle() {
		return learningStyle;
	}

	public Short getConfidenceBudgeting() {
		return confidenceBudgeting;
	}

	public Short getConfidenceSaving() {
		return confidenceSaving;
	}

	public Short getConfidenceInvesting() {
		return confidenceInvesting;
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
