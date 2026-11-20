package com.collabothon.back.duel;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface DuelPlayerRepository extends JpaRepository<DuelPlayer, String> {

	List<DuelPlayer> findAllByUserIdIn(Collection<String> userIds);

}
