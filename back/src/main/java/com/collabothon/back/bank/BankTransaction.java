package com.collabothon.back.bank;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Immutable
@Table(name = "bank_transaction")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class BankTransaction {

	static final String SALARY = "salary";

	static final String TRANSFER_INTERNAL = "transfer-internal";

	static final String INVESTMENT = "investment";

	@Id
	@Getter(AccessLevel.NONE)
	private Long id;

	private String accountId;

	private int daysAgo;

	private BigDecimal amount;

	private String category;

	private String counterparty;

	// Hand-written because the DB generates id, so @AllArgsConstructor would take one too many.
	BankTransaction(String accountId, int daysAgo, BigDecimal amount, String category, String counterparty) {
		this.accountId = accountId;
		this.daysAgo = daysAgo;
		this.amount = amount;
		this.category = category;
		this.counterparty = counterparty;
	}

	LocalDate bookedOn(LocalDate today) {
		return today.minusDays(daysAgo);
	}

}
