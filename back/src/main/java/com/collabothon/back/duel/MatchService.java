package com.collabothon.back.duel;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import com.collabothon.back.common.BadRequestException;
import com.collabothon.back.common.NotFoundException;
import com.collabothon.back.duel.BotService.BotPersona;
import com.collabothon.back.duel.DuelMessage.AnswerResult;
import com.collabothon.back.duel.DuelMessage.ErrorMessage;
import com.collabothon.back.duel.DuelPersistenceService.PlayerSnapshot;
import com.collabothon.back.duel.MatchAssembler.MatchResult;
import com.collabothon.back.duel.MatchTurnService.Outbound;
import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/**
 * Starts matches and handles what a live player does: answering, reconnecting and dropping off. The clock and the
 * scheduling of questions, bot turns and timeouts live in {@link MatchTurnService}.
 */
@Service
@EnableConfigurationProperties(DuelProperties.class)
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class MatchService {

	private final DuelPersistenceService persistence;

	private final ActiveMatchStore matchStore;

	private final DuelSessionTracker sessionTracker;

	private final DuelMessagePublisher publisher;

	private final BotService botService;

	private final QuestionSelectionService questionSelection;

	private final StoredMatchService storedMatches;

	private final MatchTurnService turns;

	private final MatchMessageMapper messages;

	private final MatchResultMapper results;

	private final Clock clock;

	public void startSoloMatch(String sessionId, String userId, DuelLang lang, DuelCategory category) {
		PlayerSnapshot player = persistence.loadPlayerSnapshot(userId, category.getId());
		List<SelectedQuestion> selected = persistence.selectQuestions(category.getId(), player.card().level(),
				List.of(userId), ThreadLocalRandom.current());
		DuelMatch saved = persistence.createMatch(
				new DuelMatch(DuelMode.SOLO, category.getId(), userId, null, null, null, clock.instant()), selected);
		PlayerSlot slotA = PlayerSlot.human(sessionId, userId, lang, player.card(), selected.size());
		turns.launchMatch(new ActiveMatch(saved.getId(), DuelMode.SOLO, category, selected, slotA, null));
	}

	public void startBotMatch(String sessionId, String userId, DuelLang lang, DuelCategory category) {
		ThreadLocalRandom rng = ThreadLocalRandom.current();
		PlayerSnapshot player = persistence.loadPlayerSnapshot(userId, category.getId());
		List<SelectedQuestion> selected = persistence.selectQuestions(category.getId(), player.card().level(),
				List.of(userId), rng);
		BotPersona persona = botService.pickPersona(rng);
		int botLevel = botService.computeLevel(player.card().level(), rng);
		PlayerCard botCard = new PlayerCard(persona.name(), botLevel, null, persona.avatar(), true);

		DuelMatch saved = persistence.createMatch(new DuelMatch(DuelMode.BOT, category.getId(), userId, null,
				persona.name(), botLevel, clock.instant()), selected);
		PlayerSlot slotA = PlayerSlot.human(sessionId, userId, lang, player.card(), selected.size());
		PlayerSlot slotB = PlayerSlot.bot(botService.botUserId(persona.name()), botLevel, botCard, selected.size());
		turns.launchMatch(new ActiveMatch(saved.getId(), DuelMode.BOT, category, selected, slotA, slotB));
	}

	public void startHumanMatch(MatchedPlayer playerA, MatchedPlayer playerB, DuelCategory category) {
		PlayerSnapshot snapA = persistence.loadPlayerSnapshot(playerA.userId(), category.getId());
		PlayerSnapshot snapB = persistence.loadPlayerSnapshot(playerB.userId(), category.getId());
		int level = questionSelection.effectiveLevel(DuelMode.HUMAN, snapA.card().level(), snapB.card().level());

		List<SelectedQuestion> selected;
		try {
			selected = persistence.selectQuestions(category.getId(), level, List.of(playerA.userId(), playerB.userId()),
					ThreadLocalRandom.current());
		}
		catch (BadRequestException ex) {
			ErrorMessage error = new ErrorMessage(DuelStompController.INVALID_REQUEST, ex.getMessage());
			publisher.sendToUser(playerA.userId(), error);
			publisher.sendToUser(playerB.userId(), error);
			return;
		}
		DuelMatch saved = persistence.createMatch(new DuelMatch(DuelMode.HUMAN, category.getId(), playerA.userId(),
				playerB.userId(), null, null, clock.instant()), selected);
		PlayerSlot slotA = PlayerSlot.human(playerA.sessionId(), playerA.userId(), playerA.lang(), snapA.card(),
				selected.size());
		PlayerSlot slotB = PlayerSlot.human(playerB.sessionId(), playerB.userId(), playerB.lang(), snapB.card(),
				selected.size());
		turns.launchMatch(new ActiveMatch(saved.getId(), DuelMode.HUMAN, category, selected, slotA, slotB));
	}

	/** Records the answer to the player's current question; stale, duplicate or foreign answers are ignored. */
	public void handleAnswer(String userId, long matchId, int index, int displayOption) {
		if (displayOption < 0 || displayOption >= QuestionSelectionService.OPTION_COUNT) {
			throw new BadRequestException("option must be between 0 and 3");
		}
		ActiveMatch match = matchStore.findById(matchId)
			.orElseThrow(() -> new NotFoundException("Active match not found: " + matchId));

		List<Outbound> outbox = new ArrayList<>();
		match.getLock().lock();
		try {
			PlayerSlot player = match.findHumanSlot(userId);
			if (match.isEnded() || player == null || player.isFinished() || index != player.getCurrentIndex()) {
				return;
			}
			player.cancelTimer();
			SelectedQuestion selected = match.getQuestions().get(index);
			int chosenOriginal = selected.optionOrder().get(displayOption);
			boolean correct = chosenOriginal == selected.question().getCorrectIndex();

			turns.recordAnswer(match, player, chosenOriginal, correct, displayOption);
			turns.emitTo(outbox, player, new AnswerResult(index, correct, false));
			turns.notifyHumanRival(match, player, outbox);
			turns.advanceHuman(match, player, outbox);
		}
		finally {
			match.getLock().unlock();
		}
		turns.flush(outbox);
	}

	/** Reattaches a reconnected player to the live match, or sends the stored result if it already ended. */
	public void handleResume(String sessionId, String userId, DuelLang lang, long matchId) {
		Optional<ActiveMatch> live = matchStore.findById(matchId);
		if (live.isPresent() && resumeLive(live.get(), sessionId, userId, lang)) {
			return;
		}
		MatchResult finished = storedMatches.findResult(matchId, userId, lang)
			.orElseThrow(() -> new NotFoundException("Match not found or abandoned: " + matchId));
		publisher.sendToUser(userId, results.toMessage(finished));
	}

	/** Marks a player disconnected; their question timer keeps running. */
	public void handleDisconnect(String userId, String sessionId, long matchId) {
		ActiveMatch match = matchStore.findById(matchId).orElse(null);
		if (match == null) {
			return;
		}
		List<Outbound> outbox = new ArrayList<>();
		match.getLock().lock();
		try {
			PlayerSlot player = match.findHumanSlot(userId);
			if (match.isEnded() || player == null || !Objects.equals(sessionId, player.getSessionId())) {
				return;
			}
			player.setConnected(false);
			player.setSessionId(null);
			turns.notifyHumanRival(match, player, outbox);
		}
		finally {
			match.getLock().unlock();
		}
		turns.flush(outbox);
	}

	/** @return false when the match ended while the player was away, so the caller falls back to the stored result */
	private boolean resumeLive(ActiveMatch match, String sessionId, String userId, DuelLang lang) {
		List<Outbound> outbox = new ArrayList<>();
		match.getLock().lock();
		try {
			if (match.isEnded()) {
				return false;
			}
			PlayerSlot player = match.findHumanSlot(userId);
			if (player == null) {
				throw new NotFoundException("Match not found: " + match.getMatchId());
			}
			player.setSessionId(sessionId);
			player.setLang(lang);
			player.setConnected(true);
			sessionTracker.setActiveMatch(sessionId, match.getMatchId());
			outbox.add(new Outbound(userId, messages.toState(MatchAssembler.state(match, player))));
			turns.notifyHumanRival(match, player, outbox);
		}
		finally {
			match.getLock().unlock();
		}
		turns.flush(outbox);
		return true;
	}

	/** A queued player handed from matchmaking to the match. */
	record MatchedPlayer(String sessionId, String userId, DuelLang lang) {
	}

}
