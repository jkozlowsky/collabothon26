package com.collabothon.back.profile.repositories;

import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.entities.profile.AccountSession;

@Transactional(propagation = Propagation.MANDATORY)
public interface AccountSessionRepository extends JpaRepository<AccountSession, String> {

	/**
	 * Conditional upsert: inserts new session or updates existing session only if
	 * the existing session belongs to the same device or its heartbeat has expired (< cutoff).
	 *
	 * Returns 1 if acquired / renewed, 0 if conflict with active session on another device.
	 */
	@Modifying
	@Query(value = """
			INSERT INTO account_session (user_id, device_id, heartbeat_at)
			VALUES (:userId, :deviceId, :heartbeatAt)
			ON CONFLICT (user_id) DO UPDATE
			SET device_id = EXCLUDED.device_id,
			    heartbeat_at = EXCLUDED.heartbeat_at
			WHERE account_session.device_id = :deviceId
			   OR account_session.heartbeat_at < :cutoff
			""", nativeQuery = true)
	int tryAcquireOrHeartbeat(
			@Param("userId") String userId,
			@Param("deviceId") String deviceId,
			@Param("heartbeatAt") Instant heartbeatAt,
			@Param("cutoff") Instant cutoff
	);

	@Modifying
	@Query(value = "DELETE FROM account_session WHERE user_id = :userId AND device_id = :deviceId", nativeQuery = true)
	int deleteByUserIdAndDeviceId(@Param("userId") String userId, @Param("deviceId") String deviceId);
}
