package com.collabothon.back.profile.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.profile.UserProfile;

@Transactional(propagation = Propagation.MANDATORY)
public interface UserProfileRepository extends JpaRepository<UserProfile, String> {
}
