package com.collabothon.back.categorization.services;

import java.util.Map;

record JevChoice<E>(E value, Map<String, Double> probabilities) {
}
