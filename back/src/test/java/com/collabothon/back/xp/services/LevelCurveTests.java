package com.collabothon.back.xp.services;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.collabothon.back.xp.consts.XpConsts;

class LevelCurveTests {

	private final LevelCurve curve = new LevelCurve();

	@Test
	void zeroXpIsLevelOne() {
		assertThat(curve.fromXp(0)).isEqualTo(new LevelInfo(1, 0, curve.costForNextLevel(1)));
	}

	@Test
	void reachingAThresholdStartsTheNextLevel() {
		int threshold = curve.totalXpForLevel(3);

		assertThat(curve.fromXp(threshold - 1).level()).isEqualTo(2);
		assertThat(curve.fromXp(threshold)).isEqualTo(new LevelInfo(3, 0, curve.costForNextLevel(3)));
	}

	@Test
	void levelIsCappedAtTheMaximum() {
		assertThat(curve.fromXp(Integer.MAX_VALUE).level()).isEqualTo(XpConsts.MAX_LEVEL);
	}

}
