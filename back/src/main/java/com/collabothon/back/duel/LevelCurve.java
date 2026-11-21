package com.collabothon.back.duel;

import org.springframework.stereotype.Component;

/**
 * Category level curve for levels 1..500 computed from total XP via precomputed
 * thresholds. Cost to go from level {@code n} to {@code n + 1}:
 * {@code round(20 + 2 * n^1.15)}.
 */
@Component
class LevelCurve {

	static final int MIN_LEVEL = 1;

	static final int MAX_LEVEL = 500;

	private final int[] thresholds;

	private final int[] costs;

	LevelCurve() {
		this.thresholds = new int[MAX_LEVEL + 1];
		this.costs = new int[MAX_LEVEL];
		this.thresholds[1] = 0;
		for (int level = 1; level < MAX_LEVEL; level++) {
			int cost = computeCost(level);
			this.costs[level] = cost;
			this.thresholds[level + 1] = this.thresholds[level] + cost;
		}
	}

	/**
	 * Returns the XP required to advance from {@code level} to {@code level + 1}.
	 *
	 * @param level current level in {@code 1..499}
	 * @return XP cost of the next level
	 * @throws IllegalArgumentException if {@code level} is out of range
	 */
	int costForNextLevel(int level) {
		if (level < MIN_LEVEL || level >= MAX_LEVEL) {
			throw new IllegalArgumentException("level must be in 1.." + (MAX_LEVEL - 1) + ", got " + level);
		}
		return costs[level];
	}

	/**
	 * Returns the cumulative total XP required to reach {@code level}.
	 *
	 * @param level target level in {@code 1..500}
	 * @return minimum total XP for {@code level}
	 * @throws IllegalArgumentException if {@code level} is out of range
	 */
	int totalXpForLevel(int level) {
		if (level < MIN_LEVEL || level > MAX_LEVEL) {
			throw new IllegalArgumentException("level must be in 1.." + MAX_LEVEL + ", got " + level);
		}
		return thresholds[level];
	}

	/**
	 * Resolves a player's current level and progress bar metrics from cumulative XP.
	 *
	 * @param totalXp cumulative XP in the category (negative values clamp to 0)
	 * @return resolved level, XP earned inside the level, and cost of the level
	 */
	LevelInfo fromXp(int totalXp) {
		int xp = Math.max(0, totalXp);
		int low = MIN_LEVEL;
		int high = MAX_LEVEL;
		while (low < high) {
			int mid = (low + high + 1) >>> 1;
			if (thresholds[mid] <= xp) {
				low = mid;
			}
			else {
				high = mid - 1;
			}
		}
		int level = low;
		if (level == MAX_LEVEL) {
			int cap = costs[MAX_LEVEL - 1];
			return new LevelInfo(MAX_LEVEL, cap, cap);
		}
		return new LevelInfo(level, xp - thresholds[level], costs[level]);
	}

	private static int computeCost(int n) {
		return (int) Math.round(20.0 + 2.0 * Math.pow(n, 1.15));
	}

	/** Level progress breakdown derived from total XP. */
	record LevelInfo(int level, int xpIntoLevel, int xpForLevel) {
	}

}
