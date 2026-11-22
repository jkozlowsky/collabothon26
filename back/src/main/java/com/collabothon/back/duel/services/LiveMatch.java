package com.collabothon.back.duel.services;

import java.util.List;

import com.collabothon.back.dto.duel.PlayerCardDto;

/** The two linked rows of a live duel and what each player needs to show the other. */
public record LiveMatch(long matchIdA, long matchIdB, String userA, String userB, PlayerCardDto cardA,
		PlayerCardDto cardB, List<String> categories) {
}
