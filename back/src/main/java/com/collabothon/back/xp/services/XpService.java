package com.collabothon.back.xp.services;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.xp.CategoryXpMapper;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.dto.xp.CategoryXpDto;
import com.collabothon.back.entities.xp.XpSource;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.xp.repositories.CategoryXpProjection;
import com.collabothon.back.xp.repositories.UserXpProjection;
import com.collabothon.back.xp.repositories.XpEventRepository;

import lombok.RequiredArgsConstructor;

/**
 * The shared XP ledger: lessons and duels write here, and every XP number in the app (profile total, category
 * levels, weekly rankings) is a sum over it.
 */
@Service
@RequiredArgsConstructor
public class XpService {

	private final XpEventRepository xpEvents;

	private final XpWeekCalculator weekCalculator;

	private final LevelCurve levelCurve;

	private final CategoryXpMapper categoryXpMapper;

	private final StoryRepository stories;

	/**
	 * Records XP once per (user, source, sourceRef, category); a repeated call is a no-op, and so is zero XP.
	 * @return true if the event was new
	 */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public boolean record(String userId, String category, XpSource source, String sourceRef, int xp, Instant at) {
		if (xp < 0) {
			throw new BusinessException(XpErrorCode.INVALID_XP_AMOUNT, String.valueOf(xp));
		}
		if (xp == 0) {
			return false;
		}
		return xpEvents.insertIfAbsent(userId, category, source.name(), sourceRef, xp, at) == 1;
	}

	/** Credits a completed lesson's XP to its category. Idempotent per (user, lesson). */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void awardLesson(String userId, String lessonId, String category, int xp, Instant at) {
		record(userId, category, XpSource.LESSON, lessonId, xp, at);
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public int totalXp(String userId) {
		if (isBlank(userId)) {
			return 0;
		}
		return Math.toIntExact(xpEvents.sumXpByUserId(userId));
	}

	/** Whether the user earned any XP in [from, to). */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public boolean hasXpBetween(String userId, Instant from, Instant to) {
		return xpEvents.existsByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(userId, from, to);
	}

	/** All-time XP per category; categories without XP are absent. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public Map<String, Integer> xpPerCategory(String userId) {
		if (isBlank(userId)) {
			return Map.of();
		}
		return toCategoryMap(xpEvents.sumXpPerCategory(userId));
	}

	/** All-time XP per user for the given users; users without XP are absent. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public Map<String, Integer> totalXpPerUser(Collection<String> userIds) {
		if (userIds.isEmpty()) {
			return Map.of();
		}
		return xpEvents.sumXpPerUser(userIds)
			.stream()
			.collect(Collectors.toMap(UserXpProjection::getUserId, row -> Math.toIntExact(row.getXp())));
	}

	/** Every story category in stories.json order, with the user's all-time and this week's XP. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<CategoryXpDto> categoryBreakdown(String userId) {
		Map<String, Integer> total = xpPerCategory(userId);
		Map<String, Integer> weekly = weeklyXpPerCategory(userId);
		return stories.findAll()
			.stream()
			.map(Story::id)
			.map(category -> toCategoryXp(category, total, weekly))
			.toList();
	}

	private CategoryXpDto toCategoryXp(String category, Map<String, Integer> total, Map<String, Integer> weekly) {
		int xp = total.getOrDefault(category, 0);
		return categoryXpMapper.toDto(category, xp, levelCurve.fromXp(xp), weekly.getOrDefault(category, 0));
	}

	private Map<String, Integer> weeklyXpPerCategory(String userId) {
		if (isBlank(userId)) {
			return Map.of();
		}
		WeekWindow week = weekCalculator.currentWeek();
		return toCategoryMap(xpEvents.sumXpPerCategoryBetween(userId, week.start(), week.end()));
	}

	private static Map<String, Integer> toCategoryMap(List<CategoryXpProjection> rows) {
		return rows.stream()
			.collect(Collectors.toMap(CategoryXpProjection::getCategory, row -> Math.toIntExact(row.getXp())));
	}

	private static boolean isBlank(String userId) {
		return userId == null || userId.isBlank();
	}

}
