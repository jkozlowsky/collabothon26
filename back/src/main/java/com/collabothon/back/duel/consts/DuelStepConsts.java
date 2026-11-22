package com.collabothon.back.duel.consts;

import java.util.Set;

import com.collabothon.back.lesson.consts.LessonConsts;

public final class DuelStepConsts {

	public static final String QUIZ = LessonConsts.QUIZ;

	public static final String PREDICT = LessonConsts.PREDICT;

	public static final String CHART = "chart";

	public static final String SORT = LessonConsts.SORT;

	public static final String MATCH = LessonConsts.MATCH;

	public static final Set<String> CHART_MODELS = Set.of("drawdownRecovery", "leverage", "oneCompanyCrash",
			"realValue", "installmentCost", "countryMix");

	public static final int MIN_QUIZ_OPTIONS = 2;

	public static final int MAX_QUIZ_OPTIONS = 4;

	public static final int MIN_ITEMS = 2;

	public static final int PAIR_SIZE = 2;

}
