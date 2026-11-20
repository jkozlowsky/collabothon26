package com.collabothon.back.bank;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.bank.BankController.CustomerSummary;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface CustomerSummaryMapper {

	CustomerSummary toSummary(Customer customer);

}
