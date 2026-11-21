package com.collabothon.back.xp.services;

import java.time.Instant;

/** A half-open week [start, end). */
public record WeekWindow(Instant start, Instant end) {
}
