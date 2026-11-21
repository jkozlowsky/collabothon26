package com.collabothon.back.entities.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "account")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Account {

	@Id
	@Column(name = "user_id", nullable = false, length = 64)
	private String userId;

	@Column(name = "first_name", nullable = false, length = 100)
	private String firstName;

	@Column(name = "last_name", nullable = false, length = 100)
	private String lastName;

	@Column(name = "avatar", nullable = false, length = 8)
	private String avatar;

	@Builder
	public Account(String userId, String firstName, String lastName, String avatar) {
		this.userId = userId;
		this.firstName = firstName;
		this.lastName = lastName;
		this.avatar = avatar;
	}

	public void changeAvatar(String avatar) {
		this.avatar = avatar;
	}

	public String getFullName() {
		String first = firstName != null ? firstName.trim() : "";
		String last = lastName != null ? lastName.trim() : "";
		if (last.isEmpty()) {
			return first;
		}
		if (first.isEmpty()) {
			return last;
		}
		return first + " " + last;
	}
}
