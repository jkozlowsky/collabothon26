package com.collabothon.back.categorization;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.collabothon.back.profile.UserProfile;

interface ProfileAnswersRepository extends Repository<UserProfile, String> {

	@Query("""
			select new com.collabothon.back.categorization.ProfileAnswers(p.lifeStage, p.goals, p.experience,
			       p.learningStyle, p.confidenceBudgeting, p.confidenceSaving, p.confidenceInvesting, p.onboardingSkipped)
			from UserProfile p where p.userId = :userId""")
	Optional<ProfileAnswers> findAnswers(String userId);

}
