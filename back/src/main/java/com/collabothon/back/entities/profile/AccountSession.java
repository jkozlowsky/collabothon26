package com.collabothon.back.entities.profile;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.collabothon.back.common.consts.UserConsts;
import com.collabothon.back.profile.consts.ProfileConsts;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "account_session")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccountSession {

	@Id
	@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
	private String userId;

	@Column(name = "device_id", nullable = false, length = ProfileConsts.MAX_DEVICE_ID_LENGTH)
	private String deviceId;

	@Column(name = "heartbeat_at", nullable = false)
	private Instant heartbeatAt;

}
