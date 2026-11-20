package com.collabothon.back.bank;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import com.collabothon.back.bank.BankController.ProductDto;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
interface ProductMapper {

	ProductDto toDto(Product product);

}
