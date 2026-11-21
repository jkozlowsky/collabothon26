package com.collabothon.back.profile;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.dto.profile.AccountDto;
import com.collabothon.back.profile.controllers.AccountController;
import com.collabothon.back.profile.services.AccountService;
import com.collabothon.back.profile.services.DemoProgressService;

@WebMvcTest(AccountController.class)
class AccountControllerSliceTests {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private AccountService accountService;

	@MockitoBean
	private DemoProgressService demoProgressService;

	@Test
	void getAccountReturnsOkWithAccountDto() throws Exception {
		when(accountService.getAccount("u123")).thenReturn(new AccountDto("u123", "Jan", "Kowalski", "m1"));

		mvc.perform(get("/api/users/u123/account"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("u123"))
				.andExpect(jsonPath("$.firstName").value("Jan"))
				.andExpect(jsonPath("$.lastName").value("Kowalski"))
				.andExpect(jsonPath("$.avatar").value("m1"));
	}
}
