package com.collabothon.back.profile;

import org.springframework.data.jpa.repository.JpaRepository;

interface UserProfileRepository extends JpaRepository<UserProfile, String> {

}
