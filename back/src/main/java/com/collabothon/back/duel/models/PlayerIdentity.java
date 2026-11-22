package com.collabothon.back.duel.models;

import java.util.Optional;

import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.entities.profile.Account;

public record PlayerIdentity(
		String name,
		String avatar
) {

	// Players don't need an account: without one, or without a name, they go by their user id.
	public static PlayerIdentity of(String userId, Optional<Account> account) {
		String name = account.map(Account::getFullName).filter(fullName -> !fullName.isBlank()).orElse(userId);
		String avatar = account.map(Account::getAvatar).orElse(DuelConsts.DEFAULT_AVATAR);
		return new PlayerIdentity(name, avatar);
	}

}
