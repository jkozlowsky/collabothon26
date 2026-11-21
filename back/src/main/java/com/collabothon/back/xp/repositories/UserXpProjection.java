package com.collabothon.back.xp.repositories;

/** XP summed per user, e.g. one row of the weekly ranking. */
public interface UserXpProjection {

	String getUserId();

	long getXp();

}
