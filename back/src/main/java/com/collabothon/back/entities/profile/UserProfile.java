package com.collabothon.back.entities.profile;

import java.time.Instant;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.collabothon.back.common.consts.UserConsts;
import com.collabothon.back.profile.consts.ProfileConsts;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_profile")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfile {

	@Id
	@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
	private String userId;

	@Column(name = "life_stage", length = 32)
	private String lifeStage;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "interests", nullable = false)
	private List<String> interests;

	@Column(name = "experience", length = 32)
	private String experience;

	@Column(name = "onboarding_completed", nullable = false)
	private boolean onboardingCompleted;

	@Column(name = "onboarding_skipped", nullable = false)
	private boolean onboardingSkipped;

	@Column(name = "onboarding_completed_at")
	private Instant onboardingCompletedAt;

	@Column(name = "preferred_lesson_mode", nullable = false, length = 8)
	private String preferredLessonMode = ProfileConsts.LESSON_MODE_VIDEO;

	public UserProfile(String userId) {
		this.userId = userId;
		this.interests = List.of();
	}

	public void completeOnboarding(String lifeStage, List<String> interests, String experience, boolean skipped,
			Instant completedAt) {
		this.lifeStage = lifeStage;
		this.interests = List.copyOf(interests);
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
		this.interests = List.of();
		this.experience = null;
		this.onboardingSkipped = false;
		this.onboardingCompleted = false;
		this.onboardingCompletedAt = null;
	}

}
