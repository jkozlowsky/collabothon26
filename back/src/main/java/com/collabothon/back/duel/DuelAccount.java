package com.collabothon.back.duel;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.Immutable;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Read-only view of the {@code account} table (owned by the profile module): first name and avatar
 * ({@code m1..m3}, {@code f1..f3}) shown on duel cards and rankings. Mapped here instead of using
 * profile's {@code Account}, which is package-private to its module in spirit; {@code @Immutable}
 * guarantees duel can never write to the bank-owned row. Fields use the same implicit column naming as
 * {@code Account}: Hibernate rejects two entities on one table that name a column differently.
 */
@Entity
@Table(name = "account")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class DuelAccount {

	/** Shown for a user without an account row. */
	static final String DEFAULT_AVATAR = "m1";

	@Id
	private String userId;

	private String firstName;

	private String avatar;

}
