package com.collabothon.back.xp;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.lesson.LessonContent;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
public class XpService {

	public static final ZoneId WARSAW_ZONE = ZoneId.of("Europe/Warsaw");

	private final JdbcClient jdbc;

	private final LevelCurve levelCurve;

	private final LessonContent lessonContent;

	private final Clock clock;

	@Transactional
	public boolean record(String userId, String category, XpSource source, String sourceRef, int xp, Instant createdAt) {
		if (xp <= 0) {
			return false;
		}
		java.sql.Timestamp ts = java.sql.Timestamp.from(createdAt);
		return jdbc.sql("""
				INSERT INTO xp_event (user_id, category, source, source_ref, xp, created_at)
				VALUES (?, ?, ?, ?, ?, ?)
				ON CONFLICT (user_id, source, source_ref, category) DO NOTHING
				""")
			.params(userId, category, source.name(), sourceRef, xp, ts)
			.update() == 1;
	}

	public int totalXp(String userId) {
		if (userId == null || userId.isBlank()) {
			return 0;
		}
		return jdbc.sql("SELECT COALESCE(SUM(xp), 0) FROM xp_event WHERE user_id = ?")
			.param(userId)
			.query(Integer.class)
			.single();
	}

	public int categoryXp(String userId, String category) {
		if (userId == null || userId.isBlank()) {
			return 0;
		}
		return jdbc.sql("SELECT COALESCE(SUM(xp), 0) FROM xp_event WHERE user_id = ? AND category = ?")
			.params(userId, category)
			.query(Integer.class)
			.single();
	}

	public WeekWindow currentWeekWindow() {
		ZonedDateTime nowInWarsaw = clock.instant().atZone(WARSAW_ZONE);
		ZonedDateTime weekStart = nowInWarsaw.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
			.truncatedTo(ChronoUnit.DAYS);
		ZonedDateTime weekEnd = weekStart.plusWeeks(1);
		return new WeekWindow(weekStart.toInstant(), weekEnd.toInstant());
	}

	public List<CategoryXpDto> categoryBreakdown(String userId) {
		WeekWindow window = currentWeekWindow();
		List<CategoryXpDto> result = new ArrayList<>();
		for (JsonNode story : lessonContent.stories()) {
			String category = story.path("id").asString();
			int total = categoryXp(userId, category);
			int weekly = (userId == null || userId.isBlank()) ? 0 : jdbc.sql("""
					SELECT COALESCE(SUM(xp), 0) FROM xp_event
					WHERE user_id = ? AND category = ? AND created_at >= ? AND created_at < ?
					""")
				.params(userId, category, java.sql.Timestamp.from(window.start()), java.sql.Timestamp.from(window.end()))
				.query(Integer.class)
				.single();
			LevelCurve.LevelInfo levelInfo = levelCurve.fromXp(total);
			result.add(new CategoryXpDto(category, total, levelInfo.level(), levelInfo.xpIntoLevel(), levelInfo.xpForLevel(), weekly));
		}
		return result;
	}

	public record WeekWindow(Instant start, Instant end) {
	}

}
