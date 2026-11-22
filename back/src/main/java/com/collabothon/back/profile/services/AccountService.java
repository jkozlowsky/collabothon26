package com.collabothon.back.profile.services;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.profile.AccountMapper;
import com.collabothon.back.dto.profile.AccountDto;
import com.collabothon.back.dto.profile.StatsDto;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.LessonActivityRepository;
import com.collabothon.back.lesson.repositories.LessonCompletionRepository;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountService {

	private final AccountRepository accounts;
	private final LessonActivityRepository activities;
	private final LessonCompletionRepository completions;
	private final XpService xpService;
	private final AccountMapper accountMapper;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public AccountDto getAccount(String userId) {
		Account account = findAccount(userId);
		return accountMapper.toDto(account);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public AccountDto changeAvatar(String userId, String avatar) {
		Account account = findAccount(userId);
		account.changeAvatar(avatar);
		return accountMapper.toDto(account);
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public StatsDto getStats(String userId, LocalDate today) {
		List<LocalDate> days = activities.findCompletedOnByUserId(userId);
		Streak streak = Streak.of(days, today);
		int totalXp = xpService.totalXp(userId);
		long completed = completions.countByIdUserId(userId);
		return accountMapper.toStatsDto(streak, totalXp, completed);
	}

	private Account findAccount(String userId) {
		return accounts.findById(userId)
				.orElseThrow(() -> new BusinessException(ProfileErrorCode.ACCOUNT_NOT_FOUND));
	}

}
