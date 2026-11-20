package com.collabothon.back.profile;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** The bank customer behind a profile. Name comes from the bank and is read-only here; only the avatar changes. */
@Entity
public class Account {

	@Id
	private String userId;

	private String firstName;

	private String lastName;

	/** One of m1-m3, f1-f3: the illustrated avatars shipped with the app. */
	private String avatar;

	protected Account() {
	}

	void changeAvatar(String avatar) {
		this.avatar = avatar;
	}

	public String getUserId() {
		return userId;
	}

	public String getFirstName() {
		return firstName;
	}

	public String getLastName() {
		return lastName;
	}

	public String getAvatar() {
		return avatar;
	}

}
