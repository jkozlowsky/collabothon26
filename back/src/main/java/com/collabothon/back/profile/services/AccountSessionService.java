package com.collabothon.back.profile.services;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.profile.AccountMapper;
import com.collabothon.back.dto.profile.DemoAccountDto;
import com.collabothon.back.dto.profile.DemoAccountStatus;
import com.collabothon.back.dto.profile.SessionResponse;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.entities.profile.AccountSession;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.profile.consts.ProfileConsts;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.profile.repositories.AccountSessionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountSessionService {

	private final AccountRepository accountRepository;
	private final AccountSessionRepository sessionRepository;
	private final AccountMapper accountMapper;
	private final Clock clock;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public List<DemoAccountDto> getDemoAccounts(String deviceId) {
		Instant cutoff = expiryCutoff(clock.instant());
		Map<String, Account> accounts = accountRepository.findAllById(ProfileConsts.LOCKABLE_ACCOUNT_IDS)
			.stream()
			.collect(Collectors.toMap(Account::getUserId, Function.identity()));
		Map<String, AccountSession> sessions = sessionRepository.findAllById(ProfileConsts.LOCKABLE_ACCOUNT_IDS)
			.stream()
			.collect(Collectors.toMap(AccountSession::getUserId, Function.identity()));

		return ProfileConsts.LOCKABLE_ACCOUNT_IDS.stream()
			.filter(accounts::containsKey)
			.map(id -> accountMapper.toDemoDto(accounts.get(id), statusOf(sessions.get(id), deviceId, cutoff)))
			.toList();
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public boolean holdsLock(String userId, String deviceId) {
		if (userId == null || deviceId == null || !isLockable(userId)) {
			return false;
		}
		Instant cutoff = expiryCutoff(clock.instant());
		return sessionRepository.findById(userId)
			.filter(session -> deviceId.equals(session.getDeviceId()))
			.filter(session -> isLive(session, cutoff))
			.isPresent();
	}

	// Also the heartbeat: acquiring a lock the device already holds renews it.
	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public SessionResponse acquireSession(String userId, String deviceId) {
		if (!isLockable(userId)) {
			throw new BusinessException(ProfileErrorCode.ACCOUNT_NOT_FOUND,
					"User " + userId + " is not a lockable demo account");
		}
		Instant now = clock.instant();
		if (sessionRepository.tryAcquireOrHeartbeat(userId, deviceId, now, expiryCutoff(now)) == 0) {
			throw new BusinessException(ProfileErrorCode.ACCOUNT_IN_USE);
		}
		return new SessionResponse(userId, ProfileConsts.SESSION_TTL.toMillis(),
				ProfileConsts.HEARTBEAT_INTERVAL.toMillis());
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public void releaseSession(String userId, String deviceId) {
		if (!isLockable(userId)) {
			return;
		}
		sessionRepository.deleteByUserIdAndDeviceId(userId, deviceId);
	}

	private static DemoAccountStatus statusOf(AccountSession session, String deviceId, Instant cutoff) {
		if (session == null || !isLive(session, cutoff)) {
			return DemoAccountStatus.FREE;
		}
		if (session.getDeviceId().equals(deviceId)) {
			return DemoAccountStatus.MINE;
		}
		return DemoAccountStatus.IN_USE;
	}

	private static boolean isLive(AccountSession session, Instant cutoff) {
		return !session.getHeartbeatAt().isBefore(cutoff);
	}

	private static Instant expiryCutoff(Instant now) {
		return now.minus(ProfileConsts.SESSION_TTL);
	}

	private static boolean isLockable(String userId) {
		return ProfileConsts.LOCKABLE_ACCOUNT_IDS.contains(userId);
	}

}
