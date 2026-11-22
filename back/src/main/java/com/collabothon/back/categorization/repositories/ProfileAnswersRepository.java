package com.collabothon.back.categorization.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.collabothon.back.categorization.repositories.projections.ProfileAnswersProjection;
import com.collabothon.back.entities.profile.UserProfile;

public interface ProfileAnswersRepository extends Repository<UserProfile, String> {

	/** Empty until the user finished or skipped onboarding; a reset profile counts as not onboarded. */
	@Query("""
			select new com.collabothon.back.categorization.repositories.projections.ProfileAnswersProjection(
			       p.lifeStage, p.interests, p.experience, p.onboardingSkipped)
			from UserProfile p where p.userId = :userId and p.onboardingCompleted""")
	Optional<ProfileAnswersProjection> findAnswers(String userId);

}
