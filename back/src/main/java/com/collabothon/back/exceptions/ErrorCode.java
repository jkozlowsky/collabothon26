package com.collabothon.back.exceptions;

import org.springframework.http.HttpStatus;

/** A business error: one enum per feature implements this, so every failure has a stable code and status. */
public interface ErrorCode {

	HttpStatus status();

	/** Polish, user-facing message returned as the problem detail. */
	String message();

	/** Stable machine-readable code, sent as the {@code code} property of the problem detail. */
	String name();

}
