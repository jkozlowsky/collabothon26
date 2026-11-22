package com.collabothon.back.lesson.validation;

import java.time.Clock;
import java.time.LocalDate;

import com.collabothon.back.common.consts.TimeConsts;
import com.collabothon.back.lesson.consts.LessonConsts;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.RequiredArgsConstructor;

// Not @PastOrPresent: a client east of UTC is already in tomorrow.
@RequiredArgsConstructor
public class CompletionDayValidator implements ConstraintValidator<CompletionDay, LocalDate> {

	private final Clock clock;

	@Override
	public boolean isValid(LocalDate day, ConstraintValidatorContext context) {
		if (day == null) {
			return true;
		}
		LocalDate latest = LocalDate.ofInstant(clock.instant(), TimeConsts.DEFAULT_ACTIVITY_ZONE)
			.plusDays(LessonConsts.MAX_COMPLETION_DAYS_AHEAD);
		return !day.isBefore(LessonConsts.EARLIEST_COMPLETION_DAY) && !day.isAfter(latest);
	}

}
