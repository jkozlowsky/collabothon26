package com.collabothon.back.xp;

import org.springframework.stereotype.Component;

/**
 * Category level curve for levels 1..500 computed from total XP via precomputed
 * thresholds. Cost to go from level {@code n} to {@code n + 1}:
 * {@code round(20 + 2 * n^1.15)}.
 */
@Component
public class LevelCurve {

	public static final int MIN_LEVEL = 1;

	public static final int MAX_LEVEL = 500;

	private final int[] thresholds;

	private final int[] costs;

	public LevelCurve() {
		this.thresholds = new int[MAX_LEVEL + 1];
		this.costs = new int[MAX_LEVEL];
		this.thresholds[1] = 0;
		for (int level = 1; level < MAX_LEVEL; level++) {
			int cost = computeCost(level);
			this.costs[level] = cost;
			this.thresholds[level + 1] = this.thresholds[level] + cost;
		}
	}

	public int costForNextLevel(int level) {
		if (level < MIN_LEVEL || level >= MAX_LEVEL) {
			throw new IllegalArgumentException("level must be in 1.." + (MAX_LEVEL - 1) + ", got " + level);
		}
		return costs[level];
	}

	public int totalXpForLevel(int level) {
		if (level < MIN_LEVEL || level > MAX_LEVEL) {
			throw new IllegalArgumentException("level must be in 1.." + MAX_LEVEL + ", got " + level);
		}
		return thresholds[level];
	}

	public LevelInfo fromXp(int totalXp) {
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

	public record LevelInfo(int level, int xpIntoLevel, int xpForLevel) {
	}

}
