package com.collabothon.back.entities.duel;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * What the player submitted for one duel question; exactly one field is set, depending on the step type. Stored as
 * JSON text in {@code duel_answer.chosen_answer} by {@link ChosenAnswerJsonConverter}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChosenAnswer(Integer option, Double value, Integer mistakes) {
}
