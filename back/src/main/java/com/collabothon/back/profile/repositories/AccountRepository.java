package com.collabothon.back.profile.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.profile.Account;

@Transactional(propagation = Propagation.MANDATORY)
public interface AccountRepository extends JpaRepository<Account, String> {

	List<Account> findByUserIdStartingWith(String prefix);

}
