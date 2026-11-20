package com.collabothon.back.bank;

import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.bank.BankController.CustomerDto;
import com.collabothon.back.bank.CustomerFactsService.Snapshot;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR,
		injectionStrategy = InjectionStrategy.CONSTRUCTOR,
		uses = { AccountMapper.class, ProductMapper.class, TransactionMapper.class })
interface CustomerMapper {

	@Mapping(target = "id", source = "customer.id")
	@Mapping(target = "name", source = "customer.name")
	@Mapping(target = "age", source = "customer.age")
	@Mapping(target = "transactions", source = "snapshot")
	CustomerDto toDto(Snapshot snapshot);

}
