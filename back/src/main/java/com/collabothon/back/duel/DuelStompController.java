package com.collabothon.back.duel;

import java.security.Principal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.messaging.converter.MessageConversionException;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import com.collabothon.back.common.BadRequestException;
import com.collabothon.back.common.NotFoundException;
import com.collabothon.back.duel.DuelMessage.ErrorMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** The player's commands over STOMP ({@code /app/duel/*}); failures come back to the sender as an {@code error} frame. */
@Controller
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Slf4j
class DuelStompController {

	/** Only matches can be missing on this channel, and the app reacts to this code when a resume finds none. */
	static final String MATCH_NOT_FOUND = "MATCH_NOT_FOUND";

	static final String INVALID_REQUEST = "INVALID_REQUEST";

	static final String INVALID_MESSAGE = "INVALID_MESSAGE";

	static final String INTERNAL_ERROR = "INTERNAL_ERROR";

	private final MatchmakingService matchmaking;

	private final MatchService matches;

	private final DuelSessionTracker sessionTracker;

	@MessageMapping("/duel/queue.join")
	void joinQueue(@Payload @Valid QueueJoinRequest request, Principal principal,
			@Header("simpSessionId") String sessionId) {
		DuelPrincipal user = connected(principal, sessionId);
		matchmaking.joinQueue(sessionId, user.userId(), user.lang(), request.category(), request.mode());
	}

	@MessageMapping("/duel/queue.leave")
	void leaveQueue(@Header("simpSessionId") String sessionId) {
		matchmaking.leaveQueue(sessionId);
	}

	@MessageMapping("/duel/queue.acceptBot")
	void acceptBot(Principal principal, @Header("simpSessionId") String sessionId) {
		DuelPrincipal user = connected(principal, sessionId);
		matchmaking.acceptBot(sessionId, user.userId(), user.lang());
	}

	@MessageMapping("/duel/answer")
	void answer(@Payload @Valid AnswerRequest request, Principal principal,
			@Header("simpSessionId") String sessionId) {
		DuelPrincipal user = connected(principal, sessionId);
		matches.handleAnswer(user.userId(), request.matchId(), request.index(), request.option());
	}

	@MessageMapping("/duel/match.resume")
	void resume(@Payload @Valid ResumeRequest request, Principal principal,
			@Header("simpSessionId") String sessionId) {
		DuelPrincipal user = connected(principal, sessionId);
		matches.handleResume(sessionId, user.userId(), user.lang(), request.matchId());
	}

	@MessageExceptionHandler(NotFoundException.class)
	@SendToUser(DuelMessagePublisher.USER_QUEUE)
	ErrorMessage notFound(NotFoundException e) {
		return new ErrorMessage(MATCH_NOT_FOUND, e.getMessage());
	}

	@MessageExceptionHandler(BadRequestException.class)
	@SendToUser(DuelMessagePublisher.USER_QUEUE)
	ErrorMessage badRequest(BadRequestException e) {
		return new ErrorMessage(INVALID_REQUEST, e.getMessage());
	}

	@MessageExceptionHandler({ MethodArgumentNotValidException.class, MessageConversionException.class })
	@SendToUser(DuelMessagePublisher.USER_QUEUE)
	ErrorMessage invalidPayload(Exception e) {
		return new ErrorMessage(INVALID_MESSAGE, e.getMessage());
	}

	@MessageExceptionHandler(Exception.class)
	@SendToUser(DuelMessagePublisher.USER_QUEUE)
	ErrorMessage unexpected(Exception e) {
		log.error("Unexpected error handling a duel frame", e);
		return new ErrorMessage(INTERNAL_ERROR, "Unexpected server error");
	}

	private DuelPrincipal connected(Principal principal, String sessionId) {
		if (!(principal instanceof DuelPrincipal user)) {
			throw new BadRequestException("A duel session is required");
		}
		sessionTracker.ensureRegistered(sessionId, user.userId());
		return user;
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record QueueJoinRequest(@NotBlank String category, @NotNull DuelMode mode) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record AnswerRequest(@NotNull Long matchId, @NotNull @Min(0) Integer index, @NotNull @Min(0) @Max(3) Integer option) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record ResumeRequest(@NotNull Long matchId) {
	}

}
