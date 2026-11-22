package com.collabothon.back.common.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import com.collabothon.back.common.consts.UserConsts;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Size;

@Documented
@Constraint(validatedBy = {})
@Size(max = UserConsts.MAX_USER_ID_LENGTH)
@NoNul
@ReportAsSingleViolation
@Target({ ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE })
@Retention(RetentionPolicy.RUNTIME)
public @interface OptionalUserId {

	String message() default "must be a valid user id";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
