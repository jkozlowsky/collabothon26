package com.collabothon.back.profile;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.collabothon.back.profile.services.Streak;

class StreakTests {

	// A Thursday.
	static final LocalDate TODAY = LocalDate.of(2026, 11, 19);

	static LocalDate daysAgo(int n) {
		return TODAY.minusDays(n);
	}

	@Test
	void noLessonsMeansNoStreak() {
		assertThat(Streak.of(List.of(), TODAY)).isEqualTo(new Streak(0, 0, false, List.of(false, false, false, false, false, false, false)));
	}

	@Test
	void streakEndingYesterdayStillCountsUntilTodayIsOver() {
		Streak s = Streak.of(List.of(daysAgo(3), daysAgo(2), daysAgo(1)), TODAY);
		assertThat(s.current()).isEqualTo(3);
		assertThat(s.doneToday()).isFalse();
	}

	@Test
	void todayExtendsTheStreakAndSeveralLessonsOnOneDayCountOnce() {
		Streak s = Streak.of(List.of(daysAgo(1), TODAY, TODAY), TODAY);
		assertThat(s.current()).isEqualTo(2);
		assertThat(s.doneToday()).isTrue();
	}

	@Test
	void aMissedDayResetsTheStreakButKeepsTheRecord() {
		Streak s = Streak.of(List.of(daysAgo(10), daysAgo(9), daysAgo(8), daysAgo(2)), TODAY);
		assertThat(s.current()).isZero();
		assertThat(s.longest()).isEqualTo(3);
	}

	@Test
	void weekRunsMondayToSunday() {
		// Monday (3 days ago) and today (Thursday).
		Streak s = Streak.of(List.of(daysAgo(3), TODAY, daysAgo(7)), TODAY);
		assertThat(s.week()).containsExactly(true, false, false, true, false, false, false);
	}

}
