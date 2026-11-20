package com.collabothon.back.common.interceptors;

import java.util.concurrent.TimeUnit;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import com.collabothon.back.common.consts.LoggingConsts;
import com.collabothon.back.common.exceptions.NotFoundException;

import lombok.extern.slf4j.Slf4j;

// Method, duration and exception type only: arguments, results and messages may carry personal data.
@Aspect
@Component
@Slf4j
class LoggingAspect {

	@Around("within(com.collabothon.back..*) && @within(org.springframework.stereotype.Service)"
			+ " && execution(public * *(..))")
	public Object logCall(ProceedingJoinPoint call) throws Throwable {
		long start = System.nanoTime();
		String method = call.getSignature().toShortString();
		try {
			Object result = call.proceed();
			long ms = millisSince(start);
			if (ms >= LoggingConsts.SLOW_CALL_MS) {
				log.info("{} took {} ms", method, ms);
			}
			else {
				log.debug("{} took {} ms", method, ms);
			}
			return result;
		}
		catch (NotFoundException e) {
			log.info("{} rejected after {} ms: {}", method, millisSince(start), e.getClass().getSimpleName());
			throw e;
		}
		catch (Throwable e) {
			log.warn("{} failed after {} ms: {}", method, millisSince(start), e.getClass().getSimpleName());
			throw e;
		}
	}

	private static long millisSince(long start) {
		return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
	}

}
