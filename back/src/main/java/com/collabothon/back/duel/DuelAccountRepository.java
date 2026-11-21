package com.collabothon.back.duel;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.repository.Repository;

/** Read-only access to accounts: deliberately not a JpaRepository, so there is no save/delete. */
interface DuelAccountRepository extends Repository<DuelAccount, String> {

	Optional<DuelAccount> findById(String userId);

	List<DuelAccount> findAll();

	List<DuelAccount> findAllByUserIdIn(Collection<String> userIds);

}
