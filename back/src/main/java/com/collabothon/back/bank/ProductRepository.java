package com.collabothon.back.bank;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface ProductRepository extends JpaRepository<Product, Long> {

	List<Product> findByCustomerIdOrderById(String customerId);

}
