package com.collabothon.back.exceptions;

import org.apache.coyote.BadRequestException;
import org.apache.tomcat.util.http.InvalidParameterException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.util.DisconnectedClientHelper;

import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

// The base class already covers malformed JSON, bean validation and ResponseStatusException.
@RestControllerAdvice
@Slf4j
class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler(BusinessException.class)
	ProblemDetail business(BusinessException e) {
		ErrorCode code = e.getCode();
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(code.getStatus(), code.getMessage());
		problem.setProperty("code", code.name());
		return problem;
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<Object> unexpected(Exception e, WebRequest request, HttpServletResponse response) throws Exception {
		HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
		// The catch-all shadows Spring's own answer to a gone client: a 500 if still possible, no ERROR log.
		if (DisconnectedClientHelper.isClientDisconnectedException(e)) {
			if (!response.isCommitted()) {
				response.sendError(status.value());
			}
			return null;
		}
		// Tomcat answers its own parse errors with a 400.
		if (e instanceof InvalidParameterException || e instanceof BadRequestException) {
			throw e;
		}
		log.error("Unhandled exception", e);
		return handleExceptionInternal(e, ProblemDetail.forStatus(status), new HttpHeaders(), status, request);
	}

}
