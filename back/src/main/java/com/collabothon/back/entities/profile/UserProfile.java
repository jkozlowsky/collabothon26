package com.collabothon.back.entities.profile;

import java.time.Instant;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_profile")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfile {

	@Id
	@Column(name = "user_id", nullable = false, length = 64)
	private String userId;

	@Column(name = "life_stage", length = 32)
	private String lifeStage;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "goals", nullable = false)
	private List<String> goals;

	@Column(name = "experience", length = 32)
	private String experience;

	@Column(name = "onboarding_completed", nullable = false)
	private boolean onboardingCompleted;

	@Column(name = "onboarding_skipped", nullable = false)
	private boolean onboardingSkipped;

	@Column(name = "onboarding_completed_at")
	private Instant onboardingCompletedAt;

	/** "classic" or "video": the mode lessons with a video track open in. Switched inside a lesson (V20). */
	@Column(name = "preferred_lesson_mode", nullable = false, length = 8)
	private String preferredLessonMode = "video";

	@Builder
	public UserProfile(String userId, String lifeStage, List<String> goals, String experience,
			boolean onboardingCompleted, boolean onboardingSkipped, Instant onboardingCompletedAt) {
		this.userId = userId;
		this.lifeStage = lifeStage;
		if (goals != null) {
			this.goals = List.copyOf(goals);
		}
		else {
			this.goals = List.of();
		}
		this.experience = experience;
		this.onboardingCompleted = onboardingCompleted;
		this.onboardingSkipped = onboardingSkipped;
		this.onboardingCompletedAt = onboardingCompletedAt;
	}

	public UserProfile(String userId) {
		this(userId, null, List.of(), null, false, false, null);
	}

	public void completeOnboarding(String lifeStage, List<String> goals, String experience, boolean skipped,
			Instant completedAt) {
		this.lifeStage = lifeStage;
		this.goals = List.copyOf(goals);
		this.experience = experience;
		this.onboardingSkipped = skipped;
		this.onboardingCompleted = true;
		this.onboardingCompletedAt = completedAt;
	}

	public void preferLessonMode(String mode) {
		this.preferredLessonMode = mode;
	}

	public void resetOnboarding() {
		this.lifeStage = null;
		this.goals = List.of();
		this.experience = null;
		this.onboardingSkipped = false;
		this.onboardingCompleted = false;
		this.onboardingCompletedAt = null;
	}
}
