package com.collabothon.back.entities.profile;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "account_session")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccountSession {

	@Id
	@Column(name = "user_id", nullable = false, length = 64)
	private String userId;

	@Column(name = "device_id", nullable = false, length = 64)
	private String deviceId;

	@Column(name = "heartbeat_at", nullable = false)
	private Instant heartbeatAt;

	@Builder
	public AccountSession(String userId, String deviceId, Instant heartbeatAt) {
		this.userId = userId;
		this.deviceId = deviceId;
		this.heartbeatAt = heartbeatAt;
	}
}
