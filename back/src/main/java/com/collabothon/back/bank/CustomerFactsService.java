package com.collabothon.back.bank;

import static com.collabothon.back.bank.Account.CURRENT;
import static com.collabothon.back.bank.Account.DEPOT;
import static com.collabothon.back.bank.Account.SAVINGS;
import static com.collabothon.back.bank.BankTransaction.INVESTMENT;
import static com.collabothon.back.bank.BankTransaction.SALARY;
import static com.collabothon.back.bank.BankTransaction.TRANSFER_INTERNAL;
import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.reducing;
import static java.util.stream.Collectors.toMap;
import static java.util.stream.Collectors.toSet;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.common.NotFoundException;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class CustomerFactsService {

	private static final int BUCKET_DAYS = 30;

	private static final int WINDOW_DAYS = Facts.WINDOW_MONTHS * BUCKET_DAYS;

	private static final BigDecimal MONTHS = BigDecimal.valueOf(Facts.WINDOW_MONTHS);

	private static final Set<String> NOT_SPENDING = Set.of(SALARY, TRANSFER_INTERNAL, INVESTMENT);

	private static final Band AGE = Band.of(Facts.AGE_BANDS, "26", "35", "45", "55", "65");

	private static final Band INCOME = Band.of(Facts.INCOME_BANDS, "1000", "2000", "3500", "5000");

	private static final Band BUFFER = Band.of(Facts.CASH_BUFFER_BANDS, "1", "3", "6");

	private static final Band SAVINGS_RATE = Band.of(Facts.SAVINGS_RATE_BANDS, "0", "0.1", "0.2");

	private final CustomerRepository customers;

	private final AccountRepository accounts;

	private final ProductRepository products;

	private final BankTransactionRepository transactions;

	private final Clock clock;

	public Optional<Facts> factsFor(String customerId) {
		return find(customerId).map(CustomerFactsService::facts);
	}

	Facts requiredFacts(String customerId) {
		return factsFor(customerId).orElseThrow(CustomerFactsService::unknownCustomer);
	}

	Snapshot snapshot(String customerId) {
		return find(customerId).orElseThrow(CustomerFactsService::unknownCustomer);
	}

	private static NotFoundException unknownCustomer() {
		return new NotFoundException("Unknown bank customer");
	}

	private Optional<Snapshot> find(String customerId) {
		LocalDate today = LocalDate.now(clock);
		return customers.findById(customerId).map(c -> {
			List<Account> owned = accounts.findByCustomerIdOrderById(c.getId());
			return snapshot(c, owned, products.findByCustomerIdOrderById(c.getId()),
					transactions.findByAccountIdInOrderByDaysAgoAscIdDesc(owned.stream().map(Account::getId).toList()),
					today);
		});
	}

	record AccountBalance(String id, String type, BigDecimal balance) {
	}

	record Snapshot(Customer customer, LocalDate today, List<AccountBalance> accounts, List<Product> products,
			List<BankTransaction> window) {

		// List.copyOf rejects a null list or element, which the generated mapper would pass on as JSON null.
		Snapshot {
			accounts = List.copyOf(accounts);
			products = List.copyOf(products);
			window = List.copyOf(window);
		}

	}

	static Snapshot snapshot(Customer customer, List<Account> accounts, List<Product> products,
			List<BankTransaction> transactions, LocalDate today) {
		Set<String> ownIds = accounts.stream().map(Account::getId).collect(toSet());
		List<BankTransaction> own = transactions.stream().filter(t -> ownIds.contains(t.getAccountId())).toList();
		List<AccountBalance> balances = accounts.stream()
			.map(a -> new AccountBalance(a.getId(), a.getType(),
					sum(own, t -> t.getAccountId().equals(a.getId())).add(a.getOpeningBalance())))
			.toList();
		List<BankTransaction> window = own.stream().filter(t -> t.getDaysAgo() < WINDOW_DAYS).toList();
		return new Snapshot(customer, today, balances, products, window);
	}

	static Facts facts(Snapshot s) {
		BigDecimal income = sum(s.window(), t -> t.getCategory().equals(SALARY));
		BigDecimal spending = sum(s.window(),
				t -> t.getAmount().signum() < 0 && !NOT_SPENDING.contains(t.getCategory())).negate();
		BigDecimal cash = s.accounts()
			.stream()
			.filter(a -> a.type().equals(CURRENT) || a.type().equals(SAVINGS))
			.map(AccountBalance::balance)
			.reduce(BigDecimal.ZERO, BigDecimal::add);
		Set<String> productTypes = s.products().stream().map(Product::getType).collect(toSet());

		return new Facts(
				AGE.label(BigDecimal.valueOf(s.customer().getAge())),
				INCOME.label(divide(income, MONTHS)),
				spending.signum() == 0 ? BUFFER.top() : BUFFER.label(divide(cash.multiply(MONTHS), spending)),
				savingsRate(income, spending),
				savingMonths(s) >= 2,
				overdraftMonths(s),
				productTypes.contains(Product.FUND_SAVINGS_PLAN),
				productTypes.contains(Product.MORTGAGE),
				productTypes.contains(Product.LIFE_INSURANCE));
	}

	private static BigDecimal sum(List<BankTransaction> transactions, Predicate<BankTransaction> filter) {
		return transactions.stream()
			.filter(filter)
			.map(BankTransaction::getAmount)
			.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private static BigDecimal divide(BigDecimal a, BigDecimal b) {
		return a.divide(b, MathContext.DECIMAL64);
	}

	private static String savingsRate(BigDecimal income, BigDecimal spending) {
		return switch (income.signum()) {
			case -1 -> SAVINGS_RATE.bottom();
			case 0 -> spending.signum() == 0 ? SAVINGS_RATE.top() : SAVINGS_RATE.bottom();
			default -> SAVINGS_RATE.label(divide(income.subtract(spending), income));
		};
	}

	private static long savingMonths(Snapshot s) {
		Map<String, String> accountType = s.accounts().stream().collect(toMap(AccountBalance::id, AccountBalance::type));
		boolean hasDepot = accountType.containsValue(DEPOT);
		return s.window()
			.stream()
			.filter(t -> savesMoney(t, accountType.get(t.getAccountId()), hasDepot))
			.map(t -> t.getDaysAgo() / BUCKET_DAYS)
			.distinct()
			.count();
	}

	// One leg per saving: money credited to savings, or to the depot (the current-account outflow without a depot).
	private static boolean savesMoney(BankTransaction t, String accountType, boolean hasDepot) {
		int sign = t.getAmount().signum();
		return switch (t.getCategory()) {
			case TRANSFER_INTERNAL -> accountType.equals(SAVINGS) && sign > 0;
			case INVESTMENT -> hasDepot ? accountType.equals(DEPOT) && sign > 0 : accountType.equals(CURRENT) && sign < 0;
			default -> false;
		};
	}

	private static int overdraftMonths(Snapshot s) {
		Set<Integer> months = new HashSet<>();
		for (AccountBalance account : s.accounts()) {
			if (!account.type().equals(CURRENT)) {
				continue;
			}
			Map<Integer, BigDecimal> byDay = s.window()
				.stream()
				.filter(t -> t.getAccountId().equals(account.id()))
				.collect(groupingBy(BankTransaction::getDaysAgo,
						reducing(BigDecimal.ZERO, BankTransaction::getAmount, BigDecimal::add)));
			// Walk back from today's balance: undoing day d's transactions gives the end of day d + 1.
			BigDecimal endOfDay = account.balance();
			for (int daysAgo = 0; daysAgo < WINDOW_DAYS; daysAgo++) {
				if (endOfDay.signum() < 0) {
					months.add(daysAgo / BUCKET_DAYS);
				}
				endOfDay = endOfDay.subtract(byDay.getOrDefault(daysAgo, BigDecimal.ZERO));
			}
		}
		return months.size();
	}

	// Lower-inclusive: bounds[i] is where labels[i + 1] starts.
	private record Band(List<String> labels, List<BigDecimal> bounds) {

		Band {
			if (labels.size() != bounds.size() + 1) {
				throw new IllegalArgumentException("A band needs one label more than bounds: " + labels);
			}
			for (int i = 1; i < bounds.size(); i++) {
				if (bounds.get(i - 1).compareTo(bounds.get(i)) >= 0) {
					throw new IllegalArgumentException("Band bounds must ascend: " + bounds);
				}
			}
		}

		static Band of(List<String> labels, String... bounds) {
			return new Band(labels, Stream.of(bounds).map(BigDecimal::new).toList());
		}

		String label(BigDecimal value) {
			int i = 0;
			while (i < bounds.size() && value.compareTo(bounds.get(i)) >= 0) {
				i++;
			}
			return labels.get(i);
		}

		String bottom() {
			return labels.getFirst();
		}

		String top() {
			return labels.getLast();
		}

	}

}
