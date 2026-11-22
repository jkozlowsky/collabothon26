package com.collabothon.back.dto.converters.profile;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import com.collabothon.back.dto.profile.AccountDto;
import com.collabothon.back.dto.profile.DemoAccountDto;
import com.collabothon.back.dto.profile.DemoAccountStatus;
import com.collabothon.back.dto.profile.StatsDto;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.services.Streak;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AccountMapper {

	AccountDto toDto(Account account);

	DemoAccountDto toDemoDto(Account account, DemoAccountStatus status);

	@Mapping(target = "currentStreak", source = "streak.current")
	@Mapping(target = "longestStreak", source = "streak.longest")
	StatsDto toStatsDto(Streak streak, int totalXp, long lessonsCompleted);

}
