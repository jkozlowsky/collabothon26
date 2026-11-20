package com.collabothon.back.bank;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.bank.BankController.AccountDto;
import com.collabothon.back.bank.CustomerFactsService.AccountBalance;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface AccountMapper {

	AccountDto toDto(AccountBalance account);

}
