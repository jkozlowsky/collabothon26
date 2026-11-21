package com.collabothon.back.duel;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** XP, Elo and human-match count of one user in one category. */
@Entity
@Table(name = "duel_progress")
@IdClass(DuelProgress.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class DuelProgress {

	static final int STARTING_ELO = 1000;

	record Key(String userId, Long categoryId) implements Serializable {
	}

	@Id
	@Column(name = "user_id", length = 64, nullable = false)
	private String userId;

	@Id
	@Column(name = "category_id", nullable = false)
	private Long categoryId;

	@Column(nullable = false)
	private int xp;

	@Column(nullable = false)
	private int elo = STARTING_ELO;

	@Column(name = "human_matches", nullable = false)
	private int humanMatches;

	DuelProgress(String userId, Long categoryId) {
		this.userId = userId;
		this.categoryId = categoryId;
	}

	/** Adds the match XP, applies the Elo delta (null for bot and solo matches) and optionally counts a human match. */
	void applyMatch(int xpGained, Integer eloDelta, boolean countHumanMatch) {
		this.xp += xpGained;
		if (eloDelta != null) {
			this.elo += eloDelta;
		}
		if (countHumanMatch) {
			this.humanMatches += 1;
		}
	}

}
