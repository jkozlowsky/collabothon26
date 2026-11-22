package com.collabothon.back.profile;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.dto.profile.DemoAccountDto;
import com.collabothon.back.dto.profile.DemoAccountStatus;
import com.collabothon.back.dto.profile.SessionResponse;
import com.collabothon.back.profile.controllers.DemoAccountController;
import com.collabothon.back.profile.services.AccountSessionService;

@WebMvcTest(DemoAccountController.class)
class DemoAccountControllerSliceTests {

	@Autowired
	MockMvc mvc;

	@MockitoBean
	AccountSessionService sessionService;

	@Test
	void getDemoAccountsReturnsList() throws Exception {
		given(sessionService.getDemoAccounts("dev-1")).willReturn(List.of(
				new DemoAccountDto("demo-user", "Alex", "Krause", "m1", DemoAccountStatus.FREE),
				new DemoAccountDto("demo-daniel", "Daniel", "Okafor", "m2", DemoAccountStatus.MINE),
				new DemoAccountDto("demo-elena", "Elena", "Petrova", "f3", DemoAccountStatus.IN_USE)
		));

		mvc.perform(get("/api/demo-accounts").param("deviceId", "dev-1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].userId").value("demo-user"))
				.andExpect(jsonPath("$[0].status").value("free"))
				.andExpect(jsonPath("$[1].userId").value("demo-daniel"))
				.andExpect(jsonPath("$[1].status").value("mine"))
				.andExpect(jsonPath("$[2].userId").value("demo-elena"))
				.andExpect(jsonPath("$[2].status").value("in-use"));
	}

	@Test
	void acquireSessionCallsService() throws Exception {
		given(sessionService.acquireSession("demo-user", "dev-1"))
				.willReturn(new SessionResponse("demo-user", 120000, 30000));

		mvc.perform(post("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-user"))
				.andExpect(jsonPath("$.ttlMs").value(120000))
				.andExpect(jsonPath("$.heartbeatMs").value(30000));
	}

	@Test
	void heartbeatCallsService() throws Exception {
		given(sessionService.acquireSession("demo-user", "dev-1"))
				.willReturn(new SessionResponse("demo-user", 120000, 30000));

		mvc.perform(put("/api/users/demo-user/session")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"deviceId\":\"dev-1\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.userId").value("demo-user"));
	}

	@Test
	void releaseSessionCallsService() throws Exception {
		mvc.perform(delete("/api/users/demo-user/session").param("deviceId", "dev-1"))
				.andExpect(status().isNoContent());

		verify(sessionService).releaseSession("demo-user", "dev-1");
	}
}
