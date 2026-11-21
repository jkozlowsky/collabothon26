package com.collabothon.back.dto.lesson;

public record ResultResponse(int xpAwarded, boolean firstCompletion, int totalXp, String next) {
}
