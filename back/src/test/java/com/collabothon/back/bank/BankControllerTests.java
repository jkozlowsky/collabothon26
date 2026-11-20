package com.collabothon.back.bank;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class BankControllerTests {

	@TestBean
	Clock clock;

	static Clock clock() {
		return Clock.fixed(Instant.parse("2026-06-15T10:00:00Z"), ZoneId.of("Europe/Berlin"));
	}

	@Autowired
	MockMvc mvc;

	@Autowired
	CustomerRepository customers;

	@Autowired
	AccountRepository accounts;

	@Autowired
	ProductRepository products;

	@Autowired
	BankTransactionRepository transactions;

	@Autowired
	CustomerMapper mapper;

	private void expectFacts(String id, String json) throws Exception {
		mvc.perform(get("/api/mock-bank/customers/{id}/facts", id))
			.andExpect(status().isOk())
			.andExpect(content().json(json, JsonCompareMode.STRICT));
	}

	@Test
	void lenaFacts() throws Exception {
		expectFacts("lena", """
				{"ageBand": "18-25", "incomeBand": "<1k", "cashBufferMonths": "<1", "savingsRate": "negative",
				 "savesRegularly": false, "overdraftMonths": 2,
				 "holdsInvestments": false, "hasMortgage": false, "hasInsurance": false}""");
	}

	@Test
	void tomFacts() throws Exception {
		expectFacts("tom", """
				{"ageBand": "26-34", "incomeBand": "3.5-5k", "cashBufferMonths": "6+", "savingsRate": "20%+",
				 "savesRegularly": false, "overdraftMonths": 0,
				 "holdsInvestments": false, "hasMortgage": false, "hasInsurance": false}""");
	}

	@Test
	void marcoFacts() throws Exception {
		expectFacts("marco", """
				{"ageBand": "35-44", "incomeBand": "3.5-5k", "cashBufferMonths": "1-3", "savingsRate": "0-10%",
				 "savesRegularly": true, "overdraftMonths": 0,
				 "holdsInvestments": false, "hasMortgage": true, "hasInsurance": false}""");
	}

	@Test
	void ingridFacts() throws Exception {
		expectFacts("ingrid", """
				{"ageBand": "55-64", "incomeBand": "3.5-5k", "cashBufferMonths": "6+", "savingsRate": "20%+",
				 "savesRegularly": true, "overdraftMonths": 0,
				 "holdsInvestments": true, "hasMortgage": false, "hasInsurance": true}""");
	}

	// Golden files are the responses of feat/profiling before the Lombok/MapStruct refactor.
	private void expectGolden(String path, String file) throws Exception {
		mvc.perform(get(path))
			.andExpect(status().isOk())
			.andExpect(content().json(new ClassPathResource(file, getClass()).getContentAsString(UTF_8),
					JsonCompareMode.STRICT));
	}

	@Test
	void listsCustomersByAge() throws Exception {
		expectGolden("/api/mock-bank/customers", "customers.json");
	}

	@Test
	void returnsRawCustomerData() throws Exception {
		expectGolden("/api/mock-bank/customers/tom", "customer-tom.json");
	}

	@Test
	void tomsFactsHoldDaysAfterMigration() {
		var later = new CustomerFactsService(customers, accounts, products, transactions,
				Clock.offset(clock, Duration.ofDays(3)));

		assertThat(later.factsFor("tom"))
			.contains(new Facts("26-34", "3.5-5k", "6+", "20%+", false, 0, false, false, false));
		assertThat(mapper.toDto(later.snapshot("tom")).transactions().getFirst().date())
			.isEqualTo(LocalDate.of(2026, 6, 17));
	}

	@Test
	void unknownCustomerIs404() throws Exception {
		mvc.perform(get("/api/mock-bank/customers/nobody"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.detail").value("Unknown bank customer"));
		mvc.perform(get("/api/mock-bank/customers/nobody/facts")).andExpect(status().isNotFound());
	}

}
