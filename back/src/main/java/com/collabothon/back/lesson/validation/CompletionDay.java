package com.collabothon.back.lesson.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Documented
@Constraint(validatedBy = CompletionDayValidator.class)
@Target({ ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface CompletionDay {

	String message() default "must be from 0001-01-01 to tomorrow in UTC";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
