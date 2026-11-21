package com.collabothon.back.profile.services;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.profile.DemoAccountDto;
import com.collabothon.back.dto.profile.DemoAccountStatus;
import com.collabothon.back.dto.profile.SessionResponse;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.entities.profile.AccountSession;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.profile.repositories.AccountSessionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountSessionService {

	public static final Duration TTL = Duration.ofSeconds(120);
	public static final Duration HEARTBEAT_INTERVAL = Duration.ofSeconds(30);

	public static final List<String> LOCKABLE_ACCOUNT_IDS = List.of(
			"demo-user",
			"demo-daniel",
			"demo-elena"
	);

	private final AccountRepository accountRepository;
	private final AccountSessionRepository sessionRepository;
	private final Clock clock;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<DemoAccountDto> getDemoAccounts(String deviceId) {
		Instant now = clock.instant();
		Instant cutoff = now.minus(TTL);

		Map<String, Account> accounts = accountRepository.findAllById(LOCKABLE_ACCOUNT_IDS)
				.stream()
				.collect(Collectors.toMap(Account::getUserId, Function.identity()));

		Map<String, AccountSession> sessions = sessionRepository.findAllById(LOCKABLE_ACCOUNT_IDS)
				.stream()
				.collect(Collectors.toMap(AccountSession::getUserId, Function.identity()));

		List<DemoAccountDto> result = new ArrayList<>(LOCKABLE_ACCOUNT_IDS.size());
		for (String userId : LOCKABLE_ACCOUNT_IDS) {
			Account account = accounts.get(userId);
			if (account == null) {
				continue;
			}
			AccountSession session = sessions.get(userId);
			DemoAccountStatus status = calculateStatus(session, deviceId, cutoff);
			result.add(new DemoAccountDto(
					account.getUserId(),
					account.getFirstName(),
					account.getLastName(),
					account.getAvatar(),
					status
			));
		}
		return result;
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public SessionResponse acquireSession(String userId, String deviceId) {
		validateLockableAccount(userId);
		return tryUpsert(userId, deviceId);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public SessionResponse heartbeat(String userId, String deviceId) {
		validateLockableAccount(userId);
		return tryUpsert(userId, deviceId);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void releaseSession(String userId, String deviceId) {
		if (!LOCKABLE_ACCOUNT_IDS.contains(userId)) {
			return;
		}
		sessionRepository.deleteByUserIdAndDeviceId(userId, deviceId);
	}

	private void validateLockableAccount(String userId) {
		if (!LOCKABLE_ACCOUNT_IDS.contains(userId)) {
			throw new BusinessException(ProfileErrorCode.ACCOUNT_NOT_FOUND, "User " + userId + " is not a lockable demo account");
		}
	}

	private SessionResponse tryUpsert(String userId, String deviceId) {
		Instant now = clock.instant();
		Instant cutoff = now.minus(TTL);

		int updated = sessionRepository.tryAcquireOrHeartbeat(userId, deviceId, now, cutoff);
		if (updated == 0) {
			throw new BusinessException(ProfileErrorCode.ACCOUNT_IN_USE);
		}
		return new SessionResponse(userId, TTL.toMillis(), HEARTBEAT_INTERVAL.toMillis());
	}

	private DemoAccountStatus calculateStatus(AccountSession session, String deviceId, Instant cutoff) {
		if (session == null) {
			return DemoAccountStatus.FREE;
		}
		if (session.getHeartbeatAt().isBefore(cutoff)) {
			return DemoAccountStatus.FREE;
		}
		if (deviceId != null && deviceId.equals(session.getDeviceId())) {
			return DemoAccountStatus.MINE;
		}
		return DemoAccountStatus.IN_USE;
	}
}
