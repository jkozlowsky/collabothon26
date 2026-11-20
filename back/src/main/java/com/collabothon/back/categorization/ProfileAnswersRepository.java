package com.collabothon.back.categorization;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.collabothon.back.profile.UserProfile;

interface ProfileAnswersRepository extends Repository<UserProfile, String> {

	/** Empty until the user finished or skipped onboarding; a reset profile counts as not onboarded. */
	@Query("""
			select new com.collabothon.back.categorization.ProfileAnswers(p.lifeStage, p.goals, p.experience,
			       p.onboardingSkipped)
			from UserProfile p where p.userId = :userId and p.onboardingCompleted""")
	Optional<ProfileAnswers> findAnswers(String userId);

}
