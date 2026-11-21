package com.collabothon.back.dto.converters.profile;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import com.collabothon.back.dto.profile.AccountDto;
import com.collabothon.back.entities.profile.Account;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AccountMapper {
	AccountDto toDto(Account account);
}
