package com.collabothon.back.categorization.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.categorization.repositories.projections.ProfileAnswersProjection;
import com.collabothon.back.entities.profile.UserProfile;

// Not a JpaRepository: categorization only reads the profile.
@Transactional(propagation = Propagation.MANDATORY)
public interface ProfileAnswersRepository extends Repository<UserProfile, String> {

	@Query("""
			select new com.collabothon.back.categorization.repositories.projections.ProfileAnswersProjection(
			       p.lifeStage, p.interests, p.experience, p.onboardingSkipped)
			from UserProfile p where p.userId = :userId and p.onboardingCompleted""")
	Optional<ProfileAnswersProjection> findAnswers(String userId);

}
