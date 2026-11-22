package com.collabothon.back.exceptions;

import org.springframework.http.HttpStatus;

// One enum per feature; name() is the stable code the API returns.
public interface ErrorCode {

	HttpStatus getStatus();

	String getMessage();

	String name();

}
