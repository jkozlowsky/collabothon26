package com.collabothon.back.xp.repositories;

/** XP summed per category for one user. */
public interface CategoryXpProjection {

	String getCategory();

	long getXp();

}
