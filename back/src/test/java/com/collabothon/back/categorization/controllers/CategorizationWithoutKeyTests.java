package com.collabothon.back.categorization.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restclient.test.autoconfigure.AutoConfigureMockRestServiceServer;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;

// The default for teammates: no key, so nothing may reach the hosted API.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "jev.api-key=")
@AutoConfigureMockMvc
@AutoConfigureMockRestServiceServer
class CategorizationWithoutKeyTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	MockRestServiceServer jev;

	@Test
	void fallsBackWithoutCallingJev() throws Exception {
		mvc.perform(put("/api/users/tom/profile/onboarding").contentType(MediaType.APPLICATION_JSON)
			.content("{\"goals\": [\"stocks-etfs\"], \"experience\": \"occasional\", \"skipped\": false}"))
			.andExpect(status().isOk());

		mvc.perform(post("/api/users/tom/categorization").contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"consent": true, "facts": {"incomeBand": "2-3.5k", "cashBufferMonths": "6+", "savingsRate": "20%+",
					 "savesRegularly": true, "inOverdraft": false, "holdsInvestments": true, "hasLoan": true}}"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.bankData").value(true))
			.andExpect(jsonPath("$.source").value("fallback"))
			.andExpect(jsonPath("$.sharedWithModel").isEmpty());
		jev.verify();
	}

	@Test
	void theBankIsServedWithoutAKey() throws Exception {
		mvc.perform(get("/api/check-questions")).andExpect(status().isOk()).andExpect(jsonPath("$").isNotEmpty());
	}

}
