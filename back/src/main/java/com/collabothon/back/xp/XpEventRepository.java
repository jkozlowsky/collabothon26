package com.collabothon.back.xp;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface XpEventRepository extends JpaRepository<XpEvent, Long> {

	List<XpEvent> findByUserId(String userId);

}
