package com.collabothon.back.lesson;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import com.collabothon.back.profile.UserProfile;

interface VariantProfileRepository extends Repository<UserProfile, String> {

	@Query("select new com.collabothon.back.lesson.VariantProfile(p.lifeStage, p.experience) from UserProfile p where p.userId = :userId")
	Optional<VariantProfile> findVariantProfile(String userId);

}
