package com.collabothon.back.entities.profile;

import java.util.Objects;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.collabothon.back.common.consts.UserConsts;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "account")
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Account {

	@Id
	@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
	private String userId;

	@Column(name = "first_name", nullable = false, length = 100)
	private String firstName;

	@Column(name = "last_name", nullable = false, length = 100)
	private String lastName;

	@Column(name = "avatar", nullable = false, length = 8)
	private String avatar;

	public void changeAvatar(String avatar) {
		this.avatar = avatar;
	}

	public String getFullName() {
		return Stream.of(firstName, lastName)
			.filter(Objects::nonNull)
			.map(String::trim)
			.filter(Predicate.not(String::isEmpty))
			.collect(Collectors.joining(" "));
	}

}
