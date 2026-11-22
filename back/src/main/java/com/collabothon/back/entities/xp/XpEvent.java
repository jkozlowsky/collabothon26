package com.collabothon.back.entities.xp;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.collabothon.back.common.consts.UserConsts;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "xp_event")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class XpEvent {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", nullable = false, updatable = false)
	private Long id;

	@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
	private String userId;

	@Column(name = "category", nullable = false, length = 32)
	private String category;

	@Enumerated(EnumType.STRING)
	@Column(name = "source", nullable = false, length = 8)
	private XpSource source;

	@Column(name = "source_ref", nullable = false, length = 64)
	private String sourceRef;

	@Column(name = "xp", nullable = false)
	private int xp;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

}
