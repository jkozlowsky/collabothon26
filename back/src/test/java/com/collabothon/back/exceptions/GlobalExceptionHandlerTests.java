package com.collabothon.back.exceptions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;

import org.apache.catalina.connector.ClientAbortException;
import org.apache.coyote.BadRequestException;
import org.apache.tomcat.util.http.InvalidParameterException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.collabothon.back.profile.controllers.AccountController;
import com.collabothon.back.profile.services.AccountService;
import com.collabothon.back.profile.services.DemoProgressService;
import com.collabothon.back.profile.services.ProfileErrorCode;

@WebMvcTest(AccountController.class)
@ExtendWith(OutputCaptureExtension.class)
class GlobalExceptionHandlerTests {

	private static final String ACCOUNT = "/api/users/private-user/account";

	@Autowired
	MockMvc mvc;

	@MockitoBean
	AccountService accountService;

	@MockitoBean
	DemoProgressService demoProgressService;

	@Test
	void unexpectedErrorIsLoggedAndAnsweredWithoutItsDetails(CapturedOutput output) throws Exception {
		when(accountService.getAccount(anyString())).thenThrow(new IllegalStateException("private detail"));

		// Strict, so neither a detail nor the request path (the instance) can slip in.
		mvc.perform(get(ACCOUNT))
			.andExpect(status().isInternalServerError())
			.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(content().json("{\"title\":\"Internal Server Error\",\"status\":500}", JsonCompareMode.STRICT));

		assertThat(output).containsPattern("ERROR.*GlobalExceptionHandler")
			.contains("java.lang.IllegalStateException: private detail", "\tat ");
	}

	@Test
	void errorsWithAnotherStatusKeepItAndTheirBody() throws Exception {
		when(accountService.getAccount(anyString()))
			.thenThrow(new BusinessException(ProfileErrorCode.ACCOUNT_NOT_FOUND));

		mvc.perform(get(ACCOUNT)).andExpect(status().isNotFound()).andExpect(content().json("""
				{"title":"Not Found","status":404,"detail":"User account not found.","code":"ACCOUNT_NOT_FOUND"}
				""", JsonCompareMode.STRICT));
		mvc.perform(get("/nope")).andExpect(status().isNotFound()).andExpect(content().json("""
				{"title":"Not Found","status":404,"detail":"No static resource nope."}
				""", JsonCompareMode.STRICT));
		mvc.perform(delete(ACCOUNT)).andExpect(status().isMethodNotAllowed()).andExpect(content().json("""
				{"title":"Method Not Allowed","status":405,"detail":"Method 'DELETE' is not supported."}
				""", JsonCompareMode.STRICT));
		mvc.perform(patch(ACCOUNT).contentType(MediaType.TEXT_PLAIN))
			.andExpect(status().isUnsupportedMediaType())
			.andExpect(content().json("""
					{"title":"Unsupported Media Type","status":415,
					"detail":"Content-Type 'text/plain;charset=UTF-8' is not supported."}
					""", JsonCompareMode.STRICT));
		mvc.perform(patch(ACCOUNT).contentType(MediaType.APPLICATION_JSON).content("{\"avatar\":\"z9\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(content().json("""
					{"title":"Bad Request","status":400,"detail":"Validation failure"}
					""", JsonCompareMode.STRICT));
	}

	// Tomcat answers both with a 400 once they leave the servlet.
	@Test
	void requestsTomcatCannotParseAreLeftToTomcat() {
		InvalidParameterException badQuery = new InvalidParameterException("bad escape");
		when(accountService.getAccount(anyString())).thenThrow(badQuery);
		assertThatThrownBy(() -> mvc.perform(get(ACCOUNT))).hasRootCause(badQuery);

		BadRequestException badBody = new BadRequestException("bad chunk");
		when(accountService.changeAvatar(anyString(), anyString())).thenAnswer(call -> {
			throw badBody;
		});
		assertThatThrownBy(() -> mvc.perform(
				patch(ACCOUNT).contentType(MediaType.APPLICATION_JSON).content("{\"avatar\":\"m1\"}")))
			.isSameAs(badBody);
	}

	@Test
	void disconnectedClientKeepsItsStatusWithoutAnErrorLog(CapturedOutput output) throws Exception {
		when(accountService.getAccount(anyString())).thenAnswer(call -> {
			throw new ClientAbortException(new IOException("Broken pipe"));
		});

		mvc.perform(get(ACCOUNT)).andExpect(status().isInternalServerError()).andExpect(content().string(""));

		assertThat(output).doesNotContain("ERROR");
	}

	@Test
	void disconnectAfterTheResponseStartedIsLeftAlone(CapturedOutput output) throws Exception {
		when(accountService.getAccount(anyString())).thenAnswer(call -> {
			((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getResponse().flushBuffer();
			throw new ClientAbortException(new IOException("Broken pipe"));
		});

		mvc.perform(get(ACCOUNT)).andExpect(status().isOk()).andExpect(content().string(""));

		assertThat(output).doesNotContain("ERROR", "Failure in @ExceptionHandler", "already committed");
	}

}
