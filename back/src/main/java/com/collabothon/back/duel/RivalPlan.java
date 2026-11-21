package com.collabothon.back.duel;

/**
 * The simulated opponent's whole match, drawn when the match starts: which original option it picks for each question
 * and how many milliseconds after the match start it answers. Progress at any moment is read from this schedule, so
 * the server needs no timers.
 */
record RivalPlan(String userId, int level, int[] chosenOriginal, boolean[] correct, long[] answeredAtMs) {

	int questionCount() {
		return correct.length;
	}

	/** How many questions the rival has answered {@code elapsedMs} after the match start. */
	int answeredBy(long elapsedMs) {
		int answered = 0;
		while (answered < answeredAtMs.length && answeredAtMs[answered] <= elapsedMs) {
			answered++;
		}
		return answered;
	}

	long finishedAtMs() {
		return answeredAtMs.length == 0 ? 0L : answeredAtMs[answeredAtMs.length - 1];
	}

	int score() {
		int score = 0;
		for (boolean right : correct) {
			if (right) {
				score++;
			}
		}
		return score;
	}

}
