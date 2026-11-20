package com.collabothon.back.bank;

import java.math.BigDecimal;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Immutable
@Table(name = "bank_account")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PACKAGE)
class Account {

	static final String CURRENT = "current";

	static final String SAVINGS = "savings";

	static final String DEPOT = "depot";

	@Id
	private String id;

	@Getter(AccessLevel.NONE)
	private String customerId;

	private String type;

	private BigDecimal openingBalance;

}
