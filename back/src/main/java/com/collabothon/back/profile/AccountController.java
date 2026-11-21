package com.collabothon.back.profile;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.collabothon.back.lesson.LessonActivityRepository;
import com.collabothon.back.lesson.LessonCompletionRepository;

import lombok.RequiredArgsConstructor;

/**
 * The user's bank account (name, avatar) and learning progress (streak, XP). Dates are the user's
 * local dates, sent by the app, so "today" matches what the user sees on their phone.
 */
@RestController
@RequestMapping("/api/users/{userId}")
@RequiredArgsConstructor
class AccountController {

	private final AccountRepository accounts;

	private final LessonActivityRepository activity;

	private final LessonCompletionRepository completions;

	private final DemoProgress demo;


	/** 404 if the bank has no such customer. */
	@GetMapping("/account")
	AccountDto account(@PathVariable String userId) {
		return AccountDto.from(find(userId));
	}

	@PatchMapping("/account")
	@Transactional
	AccountDto changeAvatar(@PathVariable String userId, @Valid @RequestBody AvatarRequest req) {
		Account account = find(userId);
		account.changeAvatar(req.avatar());
		return AccountDto.from(account);
	}

	@GetMapping("/stats")
	StatsDto stats(@PathVariable String userId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
		return statsFor(userId, today);
	}

	/** Demo helper: replaces the user's progress with the demo seed (4-day streak ending yesterday). */
	@PostMapping("/progress/reset")
	@Transactional
	StatsDto resetProgress(@PathVariable String userId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
		demo.reseed(userId, today);
		return statsFor(userId, today);
	}

	private Account find(String userId) {
		return accounts.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	private StatsDto statsFor(String userId, LocalDate today) {
		Streak streak = Streak.of(activity.findDays(userId), today);
		return new StatsDto(streak.current(), streak.longest(), streak.doneToday(), streak.week(),
				completions.totalXp(userId), completions.countByUserId(userId));
	}

	record AvatarRequest(@NotNull @Pattern(regexp = "[mf][1-3]") String avatar) {
	}

	record AccountDto(String userId, String firstName, String lastName, String avatar) {
		static AccountDto from(Account a) {
			return new AccountDto(a.getUserId(), a.getFirstName(), a.getLastName(), a.getAvatar());
		}
	}

	record StatsDto(int currentStreak, int longestStreak, boolean doneToday, List<Boolean> week, int totalXp,
			long lessonsCompleted) {
	}

}
