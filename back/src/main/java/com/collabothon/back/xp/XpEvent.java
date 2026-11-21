package com.collabothon.back.xp;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "xp_event")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class XpEvent {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", length = 64, nullable = false)
	private String userId;

	@Column(name = "category", length = 32, nullable = false)
	private String category;

	@Enumerated(EnumType.STRING)
	@Column(name = "source", length = 8, nullable = false)
	private XpSource source;

	@Column(name = "source_ref", length = 64, nullable = false)
	private String sourceRef;

	@Column(name = "xp", nullable = false)
	private int xp;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	public XpEvent(String userId, String category, XpSource source, String sourceRef, int xp, Instant createdAt) {
		this.userId = userId;
		this.category = category;
		this.source = source;
		this.sourceRef = sourceRef;
		this.xp = xp;
		this.createdAt = createdAt;
	}

}
