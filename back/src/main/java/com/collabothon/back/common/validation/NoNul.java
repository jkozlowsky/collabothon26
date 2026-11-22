package com.collabothon.back.common.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import com.collabothon.back.common.consts.ValidationConsts;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;

// Postgres text cannot hold a NUL, so a string on its way to the database must not.
@Documented
@Constraint(validatedBy = {})
@Pattern(regexp = ValidationConsts.NO_NUL_PATTERN)
@ReportAsSingleViolation
@Target({ ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE })
@Retention(RetentionPolicy.RUNTIME)
public @interface NoNul {

	String message() default "must not contain a NUL character";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
