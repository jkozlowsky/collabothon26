package com.collabothon.back.bank;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface AccountRepository extends JpaRepository<Account, String> {

	List<Account> findByCustomerIdOrderById(String customerId);

}
