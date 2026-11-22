package com.collabothon.back.xp.services;

import org.springframework.stereotype.Component;

import com.collabothon.back.xp.consts.XpConsts;

@Component
public class LevelCurve {

	private final int[] thresholds = new int[XpConsts.MAX_LEVEL + 1];

	private final int[] costs = new int[XpConsts.MAX_LEVEL];

	public LevelCurve() {
		for (int level = XpConsts.MIN_LEVEL; level < XpConsts.MAX_LEVEL; level++) {
			costs[level] = computeCost(level);
			thresholds[level + 1] = thresholds[level] + costs[level];
		}
	}

	public LevelInfo fromXp(int totalXp) {
		int xp = Math.max(0, totalXp);
		int level = levelFor(xp);
		if (level == XpConsts.MAX_LEVEL) {
			int cap = costForNextLevel(level - 1);
			return new LevelInfo(level, cap, cap);
		}
		return new LevelInfo(level, xp - totalXpForLevel(level), costForNextLevel(level));
	}

	int costForNextLevel(int level) {
		return costs[level];
	}

	int totalXpForLevel(int level) {
		return thresholds[level];
	}

	private int levelFor(int xp) {
		int low = XpConsts.MIN_LEVEL;
		int high = XpConsts.MAX_LEVEL;
		while (low < high) {
			int mid = (low + high + 1) >>> 1;
			if (thresholds[mid] <= xp) {
				low = mid;
			}
			else {
				high = mid - 1;
			}
		}
		return low;
	}

	private static int computeCost(int level) {
		return (int) Math.round(
				XpConsts.LEVEL_COST_BASE + XpConsts.LEVEL_COST_FACTOR * Math.pow(level, XpConsts.LEVEL_COST_EXPONENT));
	}

}
