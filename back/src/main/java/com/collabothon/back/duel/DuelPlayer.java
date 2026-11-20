package com.collabothon.back.duel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Display name and Explorer Avatar rank (1-4) until the account module provides them. */
@Entity
@Table(name = "duel_player")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PACKAGE)
class DuelPlayer {

	static final short DEFAULT_AVATAR = 1;

	@Id
	@Column(name = "user_id", length = 64, nullable = false)
	private String userId;

	@Column(name = "display_name", length = 64, nullable = false)
	private String displayName;

	@Column(nullable = false)
	private short avatar;

}
