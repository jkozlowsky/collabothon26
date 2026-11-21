package com.collabothon.back.duel;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.collabothon.back.common.exceptions.BadRequestException;
import com.collabothon.back.common.exceptions.NotFoundException;
import com.collabothon.back.duel.DuelContent.QuestionDef;
import com.collabothon.back.duel.DuelDtos.*;
import com.collabothon.back.lesson.LessonContent;
import com.collabothon.back.profile.Account;
import com.collabothon.back.profile.AccountRepository;
import com.collabothon.back.xp.LevelCurve;
import com.collabothon.back.xp.XpService;
import com.collabothon.back.xp.XpSource;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
@org.springframework.boot.context.properties.EnableConfigurationProperties(DuelProperties.class)
@RequiredArgsConstructor
public class DuelService {

	private final DuelMatchRepository matchRepository;

	private final DuelAnswerRepository answerRepository;

	private final DuelContent content;

	private final DuelTimerCalculator timerCalculator;

	private final DuelStepGrader grader;

	private final DuelProperties properties;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	private final LessonContent lessonContent;

	private final AccountRepository accountRepository;

	private final Clock clock;

	private final JsonMapper jsonMapper;

	@Transactional(readOnly = true)
	public List<CategoryDto> getCategories(String userId) {
		List<CategoryDto> result = new ArrayList<>();
		for (JsonNode story : lessonContent.stories()) {
			String storyId = story.path("id").asString();
			String name = story.path("category").asString(story.path("topic").asString());
			String icon = story.path("icon").asString("shield");
			String color = story.path("color").asString("teal");
			int xp = (userId != null && !userId.isBlank()) ? xpService.categoryXp(userId, storyId) : 0;
			LevelCurve.LevelInfo info = levelCurve.fromXp(xp);
			result.add(new CategoryDto(storyId, name, icon, color, xp, info.level(), info.xpIntoLevel(), info.xpForLevel()));
		}
		return result;
	}

	@Transactional
	public MatchStartDto startMatch(StartMatchRequest request) {
		if (request.userId() == null || request.userId().isBlank()) {
			throw new BadRequestException("userId cannot be blank");
		}
		if (request.categories() == null || request.categories().isEmpty() || request.categories().size() > 4) {
			throw new BadRequestException("categories must contain between 1 and 4 categories");
		}
		Set<String> validStories = lessonContent.stories().stream()
			.map(s -> s.path("id").asString())
			.collect(Collectors.toSet());
		for (String cat : request.categories()) {
			if (!validStories.contains(cat)) {
				throw new BadRequestException("Unknown category: " + cat);
			}
		}

		List<QuestionDef> questions = content.getDemoQuestions();
		if (questions.size() < 6) {
			throw new IllegalStateException("Not enough questions loaded for demo story (expected 6, got " + questions.size() + ")");
		}

		String rivalUserId = null;
		PlayerCardDto rivalCard = null;
		if (request.mode() == DuelMode.HUMAN) {
			List<Account> demoAccounts = accountRepository.findAll().stream()
				.filter(a -> a.getUserId().startsWith("demo-") && !a.getUserId().equals(request.userId()))
				.toList();
			if (!demoAccounts.isEmpty()) {
				Account picked = demoAccounts.get(ThreadLocalRandom.current().nextInt(demoAccounts.size()));
				rivalUserId = picked.getUserId();
			}
			else {
				rivalUserId = "demo-ola";
			}
			rivalCard = buildPlayerCard(rivalUserId);
		}

		PlayerCardDto youCard = buildPlayerCard(request.userId());
		Instant now = clock.instant();

		DuelMatch match = new DuelMatch(
				request.mode(),
				request.categories().toArray(String[]::new),
				request.userId(),
				rivalUserId,
				now
		);
		match = matchRepository.save(match);

		QuestionDef q0 = questions.get(0);
		long limit = timerCalculator.timeLimitMs(q0);
		long deadline = now.toEpochMilli() + limit;
		DuelQuestionDto questionDto = new DuelQuestionDto(
				0,
				q0.category(),
				DuelContent.stripAnswerFields(q0.step()),
				deadline,
				limit
		);

		return new MatchStartDto(
				match.getId(),
				match.getMode(),
				List.of(match.getCategories()),
				youCard,
				rivalCard,
				6,
				questionDto
		);
	}

	@Transactional
	public AnswerResultDto answer(long matchId, AnswerRequest request) {
		DuelMatch match = requireMatch(matchId, request.userId());
		List<QuestionDef> questions = content.getDemoQuestions();
		List<DuelAnswer> existing = answerRepository.findByMatchIdOrderByPositionAsc(matchId);

		// Idempotent retry: if index already answered, return recorded result
		if (request.index() < existing.size()) {
			return toAnswerResultDto(match, existing, request.index(), questions);
		}
		if (request.index() != existing.size()) {
			throw new BadRequestException("Expected answer index " + existing.size() + ", got " + request.index());
		}
		if (request.index() >= 6) {
			throw new BadRequestException("All questions already answered");
		}

		int index = request.index();
		QuestionDef q = questions.get(index);
		long startTime = (index == 0) ? match.getStartedAt().toEpochMilli() : existing.get(index - 1).getCreatedAt().toEpochMilli();
		long limit = timerCalculator.timeLimitMs(q);
		long deadline = startTime + limit;
		long nowMs = clock.millis();
		boolean timedOut = nowMs > deadline;

		DuelAnswerDto answerDto = new DuelAnswerDto(request.option(), request.value(), request.mistakes());
		boolean correct = !timedOut && grader.grade(q, answerDto);
		DuelAnswer.Outcome outcome = timedOut ? DuelAnswer.Outcome.TIMEOUT : DuelAnswer.Outcome.ANSWERED;
		int msTaken = timedOut ? (int) limit : (int) (nowMs - startTime);
		String chosenJson = null;
		if (!timedOut) {
			try {
				chosenJson = jsonMapper.writeValueAsString(answerDto);
			}
			catch (Exception ignored) {
			}
		}

		Boolean rivalCorrect = null;
		Instant rivalAnswerAt = null;
		if (match.getMode() == DuelMode.HUMAN) {
			int p = 0;
			for (DuelAnswer a : existing) {
				if (a.isCorrect()) {
					p++;
				}
			}
			if (correct) {
				p++;
			}
			int r = 0;
			for (DuelAnswer a : existing) {
				if (Boolean.TRUE.equals(a.getRivalCorrect())) {
					r++;
				}
			}
			int target = Math.max(p - 1, 0);
			rivalCorrect = (r < target);
			Instant answerTime = timedOut ? Instant.ofEpochMilli(deadline) : clock.instant();
			long delayMs = ThreadLocalRandom.current().nextLong(properties.botMinDelayMs(), properties.botMaxDelayMs() + 1);
			rivalAnswerAt = answerTime.plusMillis(delayMs);
		}

		DuelAnswer savedAnswer = new DuelAnswer(
				match.getId(),
				index,
				q.id(),
				q.category(),
				chosenJson,
				correct,
				outcome,
				msTaken,
				rivalCorrect,
				rivalAnswerAt,
				clock.instant()
		);
		answerRepository.save(savedAnswer);

		List<DuelAnswer> updatedAnswers = answerRepository.findByMatchIdOrderByPositionAsc(matchId);
		if (updatedAnswers.size() == 6) {
			awardFinalXpAndSaveScore(match, updatedAnswers, questions);
		}
		boolean finished = checkAndSettleMatchIfFinished(match, updatedAnswers);

		return toAnswerResultDto(match, updatedAnswers, index, questions);
	}

	@Transactional
	public MatchStateDto state(long matchId, String userId) {
		DuelMatch match = requireMatch(matchId, userId);
		List<QuestionDef> questions = content.getDemoQuestions();
		List<DuelAnswer> answers = answerRepository.findByMatchIdOrderByPositionAsc(matchId);

		// Lazily advance timeouts if needed
		if (answers.size() < 6 && match.getStatus() == DuelMatch.Status.IN_PROGRESS) {
			boolean advanced;
			do {
				advanced = false;
				if (answers.size() < 6) {
					int k = answers.size();
					QuestionDef q = questions.get(k);
					long startTime = (k == 0) ? match.getStartedAt().toEpochMilli() : answers.get(k - 1).getCreatedAt().toEpochMilli();
					long limit = timerCalculator.timeLimitMs(q);
					long deadline = startTime + limit;
					if (clock.millis() > deadline) {
						// k timed out!
						int p = (int) answers.stream().filter(DuelAnswer::isCorrect).count();
						int r = (int) answers.stream().filter(a -> Boolean.TRUE.equals(a.getRivalCorrect())).count();
						int target = Math.max(p - 1, 0);
						boolean rivalCorrect = (r < target);
						long delayMs = ThreadLocalRandom.current().nextLong(properties.botMinDelayMs(), properties.botMaxDelayMs() + 1);
						Instant deadlineInst = Instant.ofEpochMilli(deadline);
						Instant rivalAt = deadlineInst.plusMillis(delayMs);

						DuelAnswer timedOutAnswer = new DuelAnswer(
								match.getId(),
								k,
								q.id(),
								q.category(),
								null,
								false,
								DuelAnswer.Outcome.TIMEOUT,
								(int) limit,
								match.getMode() == DuelMode.HUMAN ? rivalCorrect : null,
								match.getMode() == DuelMode.HUMAN ? rivalAt : null,
								deadlineInst
						);
						answerRepository.save(timedOutAnswer);
						answers = answerRepository.findByMatchIdOrderByPositionAsc(matchId);
						advanced = true;
					}
				}
			} while (advanced);
		}

		if (answers.size() == 6) {
			awardFinalXpAndSaveScore(match, answers, questions);
		}
		boolean finished = checkAndSettleMatchIfFinished(match, answers);

		DuelQuestionDto currentQuestion = null;
		if (answers.size() < 6) {
			int k = answers.size();
			QuestionDef q = questions.get(k);
			long startTime = (k == 0) ? match.getStartedAt().toEpochMilli() : answers.get(k - 1).getCreatedAt().toEpochMilli();
			long limit = timerCalculator.timeLimitMs(q);
			long deadline = startTime + limit;
			currentQuestion = new DuelQuestionDto(k, q.category(), DuelContent.stripAnswerFields(q.step()), deadline, limit);
		}

		List<Boolean> yourResults = new ArrayList<>(Collections.nCopies(6, null));
		for (int i = 0; i < answers.size(); i++) {
			yourResults.set(i, answers.get(i).isCorrect());
		}

		YourFinalDto yourFinal = null;
		if (answers.size() == 6) {
			int score = (int) answers.stream().filter(DuelAnswer::isCorrect).count();
			int xpGained = (match.getMode() == DuelMode.HUMAN) ? score * 5 : 0;
			yourFinal = new YourFinalDto(score, xpGained);
		}

		RivalSnapshotDto rivalProgress = buildRivalSnapshot(match, answers);
		PlayerCardDto you = buildPlayerCard(match.getUserId());
		PlayerCardDto rival = (match.getRivalUserId() != null) ? buildPlayerCard(match.getRivalUserId()) : null;

		return new MatchStateDto(
				match.getId(),
				match.getMode(),
				List.of(match.getCategories()),
				you,
				rival,
				6,
				yourResults,
				currentQuestion,
				rivalProgress,
				yourFinal,
				finished
		);
	}

	@Transactional
	public MatchEndDto result(long matchId, String userId) {
		DuelMatch match = requireMatch(matchId, userId);
		List<QuestionDef> questions = content.getDemoQuestions();
		List<DuelAnswer> answers = answerRepository.findByMatchIdOrderByPositionAsc(matchId);

		checkAndSettleMatchIfFinished(match, answers);
		if (match.getStatus() != DuelMatch.Status.FINISHED) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Match is not finished yet");
		}

		if (!match.isSeenByPlayer()) {
			match.setSeenByPlayer(true);
			matchRepository.save(match);
		}

		Map<String, Integer> xpByCategory = new HashMap<>();
		List<ReviewItemDto> review = new ArrayList<>();
		for (int i = 0; i < answers.size(); i++) {
			DuelAnswer ans = answers.get(i);
			QuestionDef q = questions.get(i);
			DuelAnswerDto answerDto = null;
			if (ans.getChosenAnswer() != null) {
				try {
					answerDto = jsonMapper.readValue(ans.getChosenAnswer(), DuelAnswerDto.class);
				}
				catch (Exception ignored) {
				}
			}
			if (match.getMode() == DuelMode.HUMAN && ans.isCorrect()) {
				xpByCategory.merge(q.category(), 5, Integer::sum);
			}
			String lessonTitle = lessonContent.lesson(q.lessonId())
				.map(l -> l.path("title").asString(q.lessonId()))
				.orElse(q.lessonId());
			review.add(new ReviewItemDto(i, q.category(), q.step(), answerDto, ans.isCorrect(), q.lessonId(), lessonTitle));
		}

		PlayerCardDto you = buildPlayerCard(match.getUserId());
		PlayerCardDto rival = (match.getRivalUserId() != null) ? buildPlayerCard(match.getRivalUserId()) : null;

		return new MatchEndDto(
				match.getId(),
				match.getMode(),
				List.of(match.getCategories()),
				match.getOutcome(),
				match.getScore() != null ? match.getScore() : 0,
				match.getRivalScore(),
				you,
				rival,
				match.getXpGained(),
				xpByCategory,
				review
		);
	}

	@Transactional(readOnly = true)
	public List<MatchSummaryDto> history(String userId) {
		List<DuelMatch> list = matchRepository.findHistory(userId, PageRequest.of(0, 50));
		List<MatchSummaryDto> result = new ArrayList<>();
		for (DuelMatch m : list) {
			List<DuelAnswer> answers = answerRepository.findByMatchIdOrderByPositionAsc(m.getId());
			String status;
			if (m.getStatus() == DuelMatch.Status.FINISHED) {
				status = "FINISHED";
			}
			else if (answers.size() < 6) {
				status = "PLAYING";
			}
			else {
				status = "RIVAL_PLAYING";
			}
			int score = (int) answers.stream().filter(DuelAnswer::isCorrect).count();
			Integer rivalScore = (m.getStatus() == DuelMatch.Status.FINISHED) ? m.getRivalScore() : null;
			MatchOutcome outcome = (m.getStatus() == DuelMatch.Status.FINISHED) ? m.getOutcome() : null;
			PlayerCardDto rivalCard = (m.getRivalUserId() != null) ? buildPlayerCard(m.getRivalUserId()) : null;

			result.add(new MatchSummaryDto(
					m.getId(),
					m.getMode(),
					List.of(m.getCategories()),
					rivalCard,
					status,
					m.isSeenByPlayer(),
					score,
					rivalScore,
					outcome,
					m.getXpGained(),
					m.getStartedAt().toString()
			));
		}
		return result;
	}

	private AnswerResultDto toAnswerResultDto(DuelMatch match, List<DuelAnswer> answers, int index, List<QuestionDef> questions) {
		DuelAnswer targetAnswer = answers.get(index);
		DuelQuestionDto nextQuestion = null;
		if (index + 1 < 6) {
			QuestionDef nextQ = questions.get(index + 1);
			long limit = timerCalculator.timeLimitMs(nextQ);
			long start = targetAnswer.getCreatedAt().toEpochMilli();
			long deadline = start + limit;
			nextQuestion = new DuelQuestionDto(index + 1, nextQ.category(), DuelContent.stripAnswerFields(nextQ.step()), deadline, limit);
		}

		YourFinalDto yourFinal = null;
		if (answers.size() == 6) {
			int score = (int) answers.stream().filter(DuelAnswer::isCorrect).count();
			int xpGained = (match.getMode() == DuelMode.HUMAN) ? score * 5 : 0;
			yourFinal = new YourFinalDto(score, xpGained);
		}

		boolean finished = match.getStatus() == DuelMatch.Status.FINISHED;
		RivalSnapshotDto rivalProgress = buildRivalSnapshot(match, answers);

		return new AnswerResultDto(
				index,
				targetAnswer.isCorrect(),
				targetAnswer.getOutcome() == DuelAnswer.Outcome.TIMEOUT,
				nextQuestion,
				rivalProgress,
				yourFinal,
				finished
		);
	}

	private void awardFinalXpAndSaveScore(DuelMatch match, List<DuelAnswer> answers, List<QuestionDef> questions) {
		int score = (int) answers.stream().filter(DuelAnswer::isCorrect).count();
		int xpGained = (match.getMode() == DuelMode.HUMAN) ? score * 5 : 0;
		if (match.getMode() == DuelMode.HUMAN && xpGained > 0) {
			Map<String, Integer> catCounts = new HashMap<>();
			for (int i = 0; i < answers.size(); i++) {
				if (answers.get(i).isCorrect()) {
					String cat = questions.get(i).category();
					catCounts.merge(cat, 5, Integer::sum);
				}
			}
			for (var entry : catCounts.entrySet()) {
				xpService.record(match.getUserId(), entry.getKey(), XpSource.DUEL, String.valueOf(match.getId()), entry.getValue(), clock.instant());
			}
		}
		match.setScore(score);
		match.setXpGained(xpGained);
		matchRepository.save(match);
	}

	private boolean checkAndSettleMatchIfFinished(DuelMatch match, List<DuelAnswer> answers) {
		if (match.getStatus() == DuelMatch.Status.FINISHED) {
			return true;
		}
		if (answers.size() < 6) {
			return false;
		}
		if (match.getMode() == DuelMode.SOLO) {
			match.setStatus(DuelMatch.Status.FINISHED);
			match.setRivalScore(null);
			match.setOutcome(MatchOutcome.SOLO);
			match.setEndedAt(clock.instant());
			matchRepository.save(match);
			return true;
		}

		Instant lastRivalAt = answers.get(5).getRivalAnswerAt();
		if (lastRivalAt != null && !clock.instant().isBefore(lastRivalAt)) {
			int pScore = (int) answers.stream().filter(DuelAnswer::isCorrect).count();
			int rScore = (int) answers.stream().filter(a -> Boolean.TRUE.equals(a.getRivalCorrect())).count();
			MatchOutcome outcome;
			if (pScore > rScore) {
				outcome = MatchOutcome.WIN;
			}
			else if (pScore == rScore) {
				outcome = MatchOutcome.DRAW;
			}
			else {
				outcome = MatchOutcome.LOSS;
			}
			match.setStatus(DuelMatch.Status.FINISHED);
			match.setScore(pScore);
			match.setRivalScore(rScore);
			match.setOutcome(outcome);
			match.setEndedAt(clock.instant());
			matchRepository.save(match);
			return true;
		}
		return false;
	}

	private RivalSnapshotDto buildRivalSnapshot(DuelMatch match, List<DuelAnswer> answers) {
		if (match.getMode() == DuelMode.SOLO) {
			return null;
		}
		List<Boolean> results = new ArrayList<>(Collections.nCopies(6, null));
		int answered = 0;
		Instant now = clock.instant();
		for (int i = 0; i < answers.size(); i++) {
			DuelAnswer a = answers.get(i);
			if (a.getRivalAnswerAt() != null && !now.isBefore(a.getRivalAnswerAt())) {
				results.set(i, a.getRivalCorrect());
				answered++;
			}
		}
		return new RivalSnapshotDto(answered, results);
	}

	private PlayerCardDto buildPlayerCard(String userId) {
		Account account = accountRepository.findById(userId).orElse(null);
		String name = account != null ? account.getFirstName() : userId;
		String avatar = account != null ? account.getAvatar() : "m1";
		Map<String, Integer> levels = new LinkedHashMap<>();
		for (JsonNode story : lessonContent.stories()) {
			String sId = story.path("id").asString();
			int xp = xpService.categoryXp(userId, sId);
			levels.put(sId, levelCurve.fromXp(xp).level());
		}
		return new PlayerCardDto(name, avatar, levels);
	}

	private DuelMatch requireMatch(long matchId, String userId) {
		DuelMatch match = matchRepository.findById(matchId)
			.orElseThrow(() -> new NotFoundException("Match not found: " + matchId));
		if (!match.getUserId().equals(userId)) {
			throw new NotFoundException("Match not found: " + matchId);
		}
		return match;
	}

}
