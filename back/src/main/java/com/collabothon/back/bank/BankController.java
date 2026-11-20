package com.collabothon.back.bank;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/mock-bank/customers")
@RequiredArgsConstructor
class BankController {

	private final CustomerRepository customers;

	private final CustomerFactsService factsService;

	private final CustomerSummaryMapper summaryMapper;

	private final CustomerMapper customerMapper;

	@GetMapping
	List<CustomerSummary> list() {
		return customers.findAll(Sort.by("age", "id")).stream().map(summaryMapper::toSummary).toList();
	}

	@GetMapping("/{id}")
	CustomerDto get(@PathVariable String id) {
		return customerMapper.toDto(factsService.snapshot(id));
	}

	@GetMapping("/{id}/facts")
	Facts facts(@PathVariable String id) {
		return factsService.requiredFacts(id);
	}

	record CustomerSummary(String id, String name, int age, String headline) {
	}

	record CustomerDto(String id, String name, int age, List<AccountDto> accounts, List<ProductDto> products,
			List<TransactionDto> transactions) {
	}

	record AccountDto(String id, String type, BigDecimal balance) {
	}

	record ProductDto(String type, String label) {
	}

	record TransactionDto(LocalDate date, String accountId, BigDecimal amount, String category, String counterparty) {
	}

}
