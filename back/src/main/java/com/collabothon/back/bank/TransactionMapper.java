package com.collabothon.back.bank;

import java.time.LocalDate;
import java.util.List;

import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.bank.BankController.TransactionDto;
import com.collabothon.back.bank.CustomerFactsService.Snapshot;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface TransactionMapper {

	default List<TransactionDto> toDtos(Snapshot snapshot) {
		return toDtos(snapshot.window(), snapshot.today());
	}

	List<TransactionDto> toDtos(List<BankTransaction> transactions, @Context LocalDate today);

	@Mapping(target = "date", expression = "java(transaction.bookedOn(today))")
	TransactionDto toDto(BankTransaction transaction, @Context LocalDate today);

}
