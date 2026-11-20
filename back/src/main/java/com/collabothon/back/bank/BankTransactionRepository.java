package com.collabothon.back.bank;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface BankTransactionRepository extends JpaRepository<BankTransaction, Long> {

	List<BankTransaction> findByAccountIdInOrderByDaysAgoAscIdDesc(Collection<String> accountIds);

}
