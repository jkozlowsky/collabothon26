package com.collabothon.back.duel.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.collabothon.back.dto.converters.duel.DuelPlayerMapper;
import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

@ExtendWith(MockitoExtension.class)
class DuelPlayerCardServiceTest {

	@Mock
	AccountRepository accounts;

	@Mock
	XpService xpService;

	@Mock
	StoryRepository stories;

	LevelCurve levelCurve = new LevelCurve();

	DuelPlayerCardService service;

	@BeforeEach
	void setUp() {
		service = new DuelPlayerCardService(accounts, xpService, levelCurve, stories,
				Mappers.getMapper(DuelPlayerMapper.class));
	}

	@Test
	void cardUsesFullNameWhenFirstAndLastNamePresent() {
		when(accounts.findById("u1")).thenReturn(Optional.of(
				Account.builder().userId("u1").firstName("Anna").lastName("Kowalska").avatar("f1").build()));
		when(xpService.xpPerCategory("u1")).thenReturn(Map.of());
		when(stories.canonicalAreaSlugs()).thenReturn(List.of());

		PlayerCardDto card = service.card("u1");

		assertThat(card.name()).isEqualTo("Anna Kowalska");
		assertThat(card.avatar()).isEqualTo("f1");
	}

	@Test
	void cardUsesFirstNameOnlyWhenLastNameBlank() {
		when(accounts.findById("u2")).thenReturn(Optional.of(
				Account.builder().userId("u2").firstName("Piotr").lastName("   ").avatar("m1").build()));
		when(xpService.xpPerCategory("u2")).thenReturn(Map.of());
		when(stories.canonicalAreaSlugs()).thenReturn(List.of());

		PlayerCardDto card = service.card("u2");

		assertThat(card.name()).isEqualTo("Piotr");
		assertThat(card.avatar()).isEqualTo("m1");
	}

	@Test
	void cardFallsBackToUserIdWhenAccountNotFound() {
		when(accounts.findById("u3")).thenReturn(Optional.empty());
		when(xpService.xpPerCategory("u3")).thenReturn(Map.of());
		when(stories.canonicalAreaSlugs()).thenReturn(List.of());

		PlayerCardDto card = service.card("u3");

		assertThat(card.name()).isEqualTo("u3");
		assertThat(card.avatar()).isEqualTo(DuelConsts.DEFAULT_AVATAR);
	}

}
