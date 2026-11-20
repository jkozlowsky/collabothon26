package com.collabothon.back.bank;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Immutable
@Table(name = "bank_product")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Product {

	static final String FUND_SAVINGS_PLAN = "fund_savings_plan";

	static final String MORTGAGE = "mortgage";

	static final String LIFE_INSURANCE = "life_insurance";

	@Id
	@Getter(AccessLevel.NONE)
	private Long id;

	@Getter(AccessLevel.NONE)
	private String customerId;

	private String type;

	private String label;

}
