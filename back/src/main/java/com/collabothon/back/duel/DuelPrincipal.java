package com.collabothon.back.duel;

import java.security.Principal;

/** The STOMP session user: the {@code userId} and {@code lang} headers of the CONNECT frame. */
record DuelPrincipal(String userId, DuelLang lang) implements Principal {

	@Override
	public String getName() {
		return userId;
	}

}
