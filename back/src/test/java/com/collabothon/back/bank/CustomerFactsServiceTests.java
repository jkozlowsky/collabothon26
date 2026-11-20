package com.collabothon.back.bank;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

class CustomerFactsServiceTests {

	private static final LocalDate TODAY = LocalDate.of(2026, 11, 20);

	private static Account account(String id, String type, String opening) {
		return new Account(id, "c", type, new BigDecimal(opening));
	}

	private static BankTransaction tx(String accountId, int daysAgo, String amount, String category) {
		return new BankTransaction(accountId, daysAgo, new BigDecimal(amount), category, "Someone");
	}

	private static List<BankTransaction> monthly(String accountId, int day, String amount, String category) {
		return List.of(tx(accountId, day, amount, category), tx(accountId, day + 30, amount, category),
				tx(accountId, day + 60, amount, category));
	}

	@SafeVarargs
	private static List<BankTransaction> all(List<BankTransaction>... groups) {
		List<BankTransaction> result = new ArrayList<>();
		Arrays.stream(groups).forEach(result::addAll);
		return result;
	}

	private static CustomerFactsService.Snapshot snapshot(int age, List<Account> accounts,
			List<BankTransaction> transactions) {
		return CustomerFactsService.snapshot(new Customer("c", "C", age, "Test"), accounts, List.of(), transactions,
				TODAY);
	}

	private static Facts facts(List<Account> accounts, List<BankTransaction> transactions) {
		return CustomerFactsService.facts(snapshot(30, accounts, transactions));
	}

	@Test
	void savingAndInvestingAreNotSpending() {
		Facts facts = facts(List.of(account("cur", "current", "0"), account("sav", "savings", "0")),
				all(monthly("cur", 20, "3000", "salary"), monthly("cur", 15, "-1500", "investment"),
						monthly("cur", 10, "-1000", "transfer-internal"), monthly("sav", 10, "1000", "transfer-internal"),
						monthly("cur", 5, "-100", "groceries")));

		assertThat(facts.savingsRate()).isEqualTo("20%+");
		assertThat(facts.cashBufferMonths()).isEqualTo("6+");
	}

	@Test
	void savesRegularlyNeedsTwoOfThreeMonths() {
		List<Account> savings = List.of(account("sav", "savings", "0"));

		assertThat(facts(savings, List.of(tx("sav", 5, "100", "transfer-internal"))).savesRegularly()).isFalse();
		assertThat(facts(savings, List.of(tx("sav", 5, "100", "transfer-internal"), tx("sav", 35, "100", "transfer-internal")))
			.savesRegularly()).isTrue();
	}

	@Test
	void windowIsTheLast90Days() {
		List<Account> savings = List.of(account("sav", "savings", "0"));

		assertThat(facts(savings, List.of(tx("sav", 89, "100", "transfer-internal"), tx("sav", 59, "100", "transfer-internal")))
			.savesRegularly()).isTrue();
		assertThat(facts(savings, List.of(tx("sav", 90, "100", "transfer-internal"), tx("sav", 5, "100", "transfer-internal")))
			.savesRegularly()).isFalse();
	}

	@Test
	void investmentCountsTheDepotInflowOrWithoutDepotTheCurrentOutflow() {
		List<Account> withDepot = List.of(account("cur", "current", "1000"), account("dep", "depot", "0"));
		List<Account> currentOnly = List.of(account("cur", "current", "1000"));

		assertThat(facts(withDepot, List.of(tx("dep", 5, "400", "investment"), tx("dep", 35, "400", "investment")))
			.savesRegularly()).isTrue();
		assertThat(facts(withDepot, List.of(tx("cur", 5, "-400", "investment"), tx("cur", 35, "-400", "investment")))
			.savesRegularly()).isFalse();
		assertThat(facts(withDepot, List.of(tx("cur", 29, "-400", "investment"), tx("dep", 30, "400", "investment")))
			.savesRegularly()).isFalse();
		assertThat(facts(currentOnly, List.of(tx("cur", 5, "-400", "investment"), tx("cur", 35, "-400", "investment")))
			.savesRegularly()).isTrue();
		assertThat(facts(currentOnly, List.of(tx("cur", 5, "400", "investment"), tx("cur", 35, "400", "investment")))
			.savesRegularly()).isFalse();
	}

	@Test
	void withdrawalsAndFundSalesAreNotSaving() {
		assertThat(facts(List.of(account("sav", "savings", "1000")),
				List.of(tx("sav", 5, "-100", "transfer-internal"), tx("sav", 35, "-100", "transfer-internal")))
			.savesRegularly()).isFalse();
		assertThat(facts(List.of(account("dep", "depot", "1000")),
				List.of(tx("dep", 5, "-400", "investment"), tx("dep", 35, "-400", "investment")))
			.savesRegularly()).isFalse();
	}

	@Test
	void bandsAreLowerInclusive() {
		assertThat(CustomerFactsService.facts(snapshot(25, List.of(), List.of())).ageBand()).isEqualTo("18-25");
		assertThat(CustomerFactsService.facts(snapshot(26, List.of(), List.of())).ageBand()).isEqualTo("26-34");
		assertThat(CustomerFactsService.facts(snapshot(64, List.of(), List.of())).ageBand()).isEqualTo("55-64");
		assertThat(CustomerFactsService.facts(snapshot(65, List.of(), List.of())).ageBand()).isEqualTo("65+");

		List<Account> current = List.of(account("cur", "current", "0"));
		assertThat(facts(current, monthly("cur", 5, "3500", "salary")).incomeBand()).isEqualTo("3.5-5k");
		assertThat(facts(current, monthly("cur", 5, "3499.99", "salary")).incomeBand()).isEqualTo("2-3.5k");
	}

	@Test
	void depotIsNotCash() {
		Facts facts = facts(List.of(account("cur", "current", "3500"), account("dep", "depot", "50000")),
				monthly("cur", 5, "-1000", "groceries"));

		assertThat(facts.cashBufferMonths()).isEqualTo("<1");
	}

	@Test
	void overdraftCountsEveryCurrentAccount() {
		Facts facts = facts(List.of(account("cur-a", "current", "100"), account("cur-b", "current", "100")),
				List.of(tx("cur-b", 30, "-200", "rent")));

		assertThat(facts.overdraftMonths()).isEqualTo(2);
	}

	@Test
	void negativeIncomeIsNegativeSavingsRate() {
		Facts withSpending = facts(List.of(account("cur", "current", "1000")),
				List.of(tx("cur", 5, "-100", "salary"), tx("cur", 6, "-50", "groceries")));
		Facts withoutSpending = facts(List.of(account("cur", "current", "110")), List.of(tx("cur", 5, "-100", "salary")));

		assertThat(withSpending.savingsRate()).isEqualTo("negative");
		assertThat(withoutSpending.savingsRate()).isEqualTo("negative");
		assertThat(withoutSpending.cashBufferMonths()).as("a salary correction is not spending").isEqualTo("6+");
	}

	@Test
	void zeroIncomeIsTopRateOnlyWithoutSpending() {
		List<Account> current = List.of(account("cur", "current", "500"));

		assertThat(facts(current, List.of()).savingsRate()).isEqualTo("20%+");
		assertThat(facts(current, List.of(tx("cur", 5, "-50", "groceries"))).savingsRate()).isEqualTo("negative");
	}

	@Test
	void snapshotIgnoresTransactionsOfForeignAccounts() {
		var snapshot = snapshot(30, List.of(account("cur", "current", "500")),
				List.of(tx("cur", 5, "-10", "groceries"), tx("other", 5, "-500", "groceries"),
						tx("other", 35, "100", "transfer-internal")));
		Facts facts = CustomerFactsService.facts(snapshot);

		assertThat(snapshot.window()).hasSize(1);
		assertThat(facts.cashBufferMonths()).isEqualTo("6+");
		assertThat(facts.savesRegularly()).isFalse();
	}

	@Test
	void snapshotShowsOnlyTheWindowButBalanceCountsEverything() {
		var snapshot = snapshot(30, List.of(account("cur", "current", "100")),
				List.of(tx("cur", 1, "-10", "groceries"), tx("cur", 90, "-20", "groceries")));

		assertThat(snapshot.window()).hasSize(1);
		assertThat(snapshot.window().getFirst().bookedOn(snapshot.today())).isEqualTo(TODAY.minusDays(1));
		assertThat(snapshot.accounts().getFirst().balance()).isEqualByComparingTo("70");
	}

}
