package com.collabothon.back.duel;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import com.collabothon.back.common.BadRequestException;
import com.collabothon.back.common.NotFoundException;
import com.collabothon.back.duel.BotService.BotPersona;
import com.collabothon.back.duel.DuelPersistenceService.PlayerSnapshot;
import com.collabothon.back.duel.MatchAssembler.AnswerOutcome;
import com.collabothon.back.duel.MatchAssembler.MatchResult;
import com.collabothon.back.duel.MatchAssembler.MatchStateView;
import com.collabothon.back.duel.MatchAssembler.StartView;
import com.collabothon.back.duel.QuestionSelectionService.SelectedQuestion;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/**
 * Plays a match over plain request/response. There are no timers: every call first brings the match up to date from
 * the injected clock, so a question past its deadline counts as unanswered and the simulated rival's answers appear
 * as their scheduled times pass. The rival (a mocked human or a bot) is drawn once, when the match starts.
 */
@Service
@EnableConfigurationProperties(DuelProperties.class)
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
class MatchService {

	private final DuelPersistenceService persistence;

	private final ActiveMatchStore matchStore;

	private final BotService botService;

	private final QuestionSelectionService questionSelection;

	private final StoredMatchService storedMatches;

	private final DuelProperties properties;

	private final Clock clock;

	StartView start(String userId, String categorySlug, DuelMode mode, DuelLang lang) {
		DuelCategory category = persistence.requireCategory(categorySlug);
		ThreadLocalRandom rng = ThreadLocalRandom.current();
		PlayerSnapshot player = persistence.loadPlayerSnapshot(userId, category.getId());

		String humanRival = null;
		String botName = null;
		Integer botLevel = null;
		PlayerCard rivalCard = null;
		String rivalUserId = null;
		int rivalLevel = 0;
		int questionLevel = player.card().level();
		switch (mode) {
			case HUMAN -> {
				humanRival = persistence.pickRival(category.getId(), userId, player.elo(), rng)
					.orElseThrow(() -> new BadRequestException("No rival available in " + categorySlug));
				rivalCard = persistence.loadPlayerSnapshot(humanRival, category.getId()).card();
				rivalUserId = humanRival;
				rivalLevel = rivalCard.level();
				questionLevel = questionSelection.effectiveLevel(mode, player.card().level(), rivalLevel);
			}
			case BOT -> {
				BotPersona persona = botService.pickPersona(rng);
				botName = persona.name();
				botLevel = botService.computeLevel(player.card().level(), rng);
				rivalCard = new PlayerCard(botName, botLevel, null, null, true);
				rivalUserId = botService.botUserId(botName);
				rivalLevel = botLevel;
			}
			case SOLO -> {
			}
		}

		List<String> seen = humanRival != null ? List.of(userId, humanRival) : List.of(userId);
		List<SelectedQuestion> selected = persistence.selectQuestions(category.getId(), questionLevel, seen, rng);
		long now = clock.millis();
		DuelMatch saved = persistence.createMatch(
				new DuelMatch(mode, category.getId(), userId, humanRival, botName, botLevel, clock.instant()), selected);
		RivalPlan plan = rivalUserId != null ? botService.planMatch(rivalUserId, rivalLevel, selected, rng) : null;

		ActiveMatch match = new ActiveMatch(saved.getId(), mode, category, selected, userId, player.card(), rivalCard,
				plan, lang, now, properties.questionTimeoutMs());
		matchStore.put(match, now);
		return MatchAssembler.start(match);
	}

	/**
	 * Records the answer to the player's current question. An index the player already answered (or timed out on)
	 * returns the stored outcome instead of changing anything, so a retried request is harmless.
	 */
	AnswerOutcome answer(long matchId, String userId, int index, int option) {
		ActiveMatch match = require(matchId, userId);
		synchronized (match) {
			long now = clock.millis();
			refresh(match, now);
			if (index < 0 || index >= match.getQuestions().size() || index > match.getCurrentIndex()) {
				throw new BadRequestException("Question " + index + " is not open");
			}
			if (index < match.getCurrentIndex()) {
				return outcome(match, index, now);
			}
			SelectedQuestion selected = match.getQuestions().get(index);
			int chosenOriginal = selected.optionOrder().get(option);
			boolean correct = chosenOriginal == selected.question().getCorrectIndex();
			persistence.saveAnswer(new DuelAnswer(matchId, userId, selected.question().getId(), index, chosenOriginal,
					correct, DuelAnswer.Outcome.ANSWERED, (int) Math.max(0L, now - match.getQuestionStartedAt()),
					clock.instant()));
			match.recordAnswer(correct, option, now, properties.questionTimeoutMs());
			refresh(match, now);
			return outcome(match, index, now);
		}
	}

	MatchStateView state(long matchId, String userId, DuelLang lang) {
		ActiveMatch match = require(matchId, userId);
		synchronized (match) {
			long now = clock.millis();
			match.setLang(lang);
			refresh(match, now);
			return MatchAssembler.state(match, now);
		}
	}

	/** The stored result once the match has finished; a match still running is "not found" until then. */
	MatchResult result(long matchId, String userId, DuelLang lang) {
		matchStore.findById(matchId).filter(match -> match.getUserId().equals(userId)).ifPresent(match -> {
			synchronized (match) {
				refresh(match, clock.millis());
			}
		});
		return storedMatches.findResult(matchId, userId, lang)
			.orElseThrow(() -> new NotFoundException("Match not found: " + matchId));
	}

	private ActiveMatch require(long matchId, String userId) {
		return matchStore.findById(matchId)
			.filter(match -> match.getUserId().equals(userId))
			.orElseThrow(() -> new NotFoundException("Active match not found: " + matchId));
	}

	private AnswerOutcome outcome(ActiveMatch match, int index, long now) {
		return new AnswerOutcome(index, Boolean.TRUE.equals(match.getResults()[index]), match.getTimedOut()[index],
				MatchAssembler.currentQuestion(match), MatchAssembler.rivalSnapshot(match, now), match.isEnded());
	}

	/** Resolves timeouts up to {@code now}, then settles the match once the player and the rival are both done. */
	private void refresh(ActiveMatch match, long now) {
		if (match.isEnded()) {
			return;
		}
		while (!match.isFinished() && now >= match.getQuestionDeadline()) {
			SelectedQuestion selected = match.getQuestions().get(match.getCurrentIndex());
			persistence.saveAnswer(new DuelAnswer(match.getMatchId(), match.getUserId(), selected.question().getId(),
					match.getCurrentIndex(), null, false, DuelAnswer.Outcome.TIMEOUT,
					(int) properties.questionTimeoutMs(), clock.instant()));
			match.recordTimeout(properties.questionTimeoutMs());
		}
		RivalPlan rival = match.getRival();
		boolean rivalDone = rival == null || now - match.getStartedAtMs() >= rival.finishedAtMs();
		if (match.isFinished() && rivalDone) {
			settle(match, now);
		}
	}

	private void settle(ActiveMatch match, long now) {
		RivalPlan rival = match.getRival();
		Integer rivalScore = null;
		if (rival != null) {
			rivalScore = rival.score();
			for (int i = 0; i < rival.questionCount(); i++) {
				persistence.saveAnswer(new DuelAnswer(match.getMatchId(), rival.userId(),
						match.getQuestions().get(i).question().getId(), i, rival.chosenOriginal()[i], rival.correct()[i],
						DuelAnswer.Outcome.ANSWERED, (int) (rival.answeredAtMs()[i] - (i == 0 ? 0 : rival.answeredAtMs()[i - 1])),
						Instant.ofEpochMilli(match.getStartedAtMs() + rival.answeredAtMs()[i])));
			}
		}
		persistence.completeMatch(match.getMatchId(), match.getScore(), rivalScore, false, clock.instant());
		match.end(now);
	}

}
