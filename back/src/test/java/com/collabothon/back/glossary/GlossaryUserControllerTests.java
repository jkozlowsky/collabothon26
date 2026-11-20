package com.collabothon.back.glossary;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class GlossaryUserControllerTests {

	@Autowired
	MockMvc mvc;

	@Test
	void savingATermTwiceKeepsOneFavouriteAndRemovingItEmptiesTheList() throws Exception {
		String base = "/api/users/fav-user-1/glossary/favorites";
		mvc.perform(get(base)).andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());

		mvc.perform(put(base + "/etf")).andExpect(status().isNoContent());
		mvc.perform(put(base + "/etf")).andExpect(status().isNoContent());
		mvc.perform(put(base + "/stock")).andExpect(status().isNoContent());
		mvc.perform(get(base))
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0]").value("etf"))
			.andExpect(jsonPath("$[1]").value("stock"));

		mvc.perform(delete(base + "/etf")).andExpect(status().isNoContent());
		mvc.perform(delete(base + "/etf")).andExpect(status().isNoContent());
		mvc.perform(get(base)).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0]").value("stock"));
	}

	@Test
	void favouritesBelongToOneUser() throws Exception {
		mvc.perform(put("/api/users/fav-user-2/glossary/favorites/bond")).andExpect(status().isNoContent());
		mvc.perform(get("/api/users/fav-user-3/glossary/favorites")).andExpect(jsonPath("$").isEmpty());
	}

	@Test
	void unknownTermCannotBeSavedButCanBeRemoved() throws Exception {
		mvc.perform(put("/api/users/fav-user-4/glossary/favorites/nope")).andExpect(status().isNotFound());
		mvc.perform(delete("/api/users/fav-user-4/glossary/favorites/nope")).andExpect(status().isNoContent());
	}

	@Test
	void rejectsAnInvalidUserId() throws Exception {
		mvc.perform(get("/api/users/" + "u".repeat(65) + "/glossary/favorites")).andExpect(status().isBadRequest());
	}

	@Test
	void preferenceIsNullUntilChosenThenSticks() throws Exception {
		String url = "/api/users/pref-user-1/glossary/preference";
		mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$.languageLevel").isEmpty());

		mvc.perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"languageLevel\":\"plain\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.languageLevel").value("plain"));
		mvc.perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"languageLevel\":\"standard\"}"))
			.andExpect(status().isOk());
		mvc.perform(get(url)).andExpect(jsonPath("$.languageLevel").value("standard"));
	}

	@Test
	void preferenceRejectsUnknownValues() throws Exception {
		String url = "/api/users/pref-user-2/glossary/preference";
		for (String body : new String[] { "{\"languageLevel\":\"expert\"}", "{}", "{\"languageLevel\":null}" }) {
			mvc.perform(put(url).contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest());
		}
	}

}
