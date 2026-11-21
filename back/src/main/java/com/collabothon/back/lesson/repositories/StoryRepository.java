package com.collabothon.back.lesson.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Repository;

import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.dto.lesson.Story.Currency;
import com.collabothon.back.dto.lesson.Story.Landmark;
import com.collabothon.back.dto.lesson.Story.Pin;
import com.collabothon.back.dto.lesson.Story.StoryCharacter;
import com.collabothon.back.dto.lesson.Story.Word;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Repository
public class StoryRepository {

	private final Map<String, Story> stories = new LinkedHashMap<>();
	private final List<Story> storyList = new ArrayList<>();
	private final List<JsonNode> rawStoryNodes = new ArrayList<>();

	public StoryRepository(JsonMapper json) throws IOException {
		var resolver = new PathMatchingResourcePatternResolver();
		Resource res = resolver.getResource("classpath:content/stories.json");
		JsonNode root;
		try (InputStream in = res.getInputStream()) {
			root = json.readTree(in);
		}
		for (JsonNode s : root) {
			rawStoryNodes.add(s);
			Story story = mapStory(s);
			stories.put(story.id(), story);
			storyList.add(story);
		}
	}

	public List<Story> findAll() {
		return Collections.unmodifiableList(storyList);
	}

	public Optional<Story> findById(String id) {
		if (id == null) {
			return Optional.empty();
		}
		return Optional.ofNullable(stories.get(id));
	}

	public List<JsonNode> rawStories() {
		return Collections.unmodifiableList(rawStoryNodes);
	}

	public Optional<JsonNode> findRawById(String id) {
		if (id == null) {
			return Optional.empty();
		}
		for (JsonNode s : rawStoryNodes) {
			if (id.equals(s.path("id").asString(""))) {
				return Optional.of(s);
			}
		}
		return Optional.empty();
	}

	private static Story mapStory(JsonNode s) {
		String id = s.path("id").asString("");
		String category = s.path("category").asString("");
		String city = s.path("city").asString("");
		String topic = s.path("topic").asString("");
		String status = s.path("status").asString("");

		JsonNode p = s.path("pin");
		Pin pin = new Pin(p.path("lat").asDouble(0.0), p.path("lng").asDouble(0.0));

		String icon = s.path("icon").asString("");
		String color = s.path("color").asString("");

		JsonNode lm = s.path("landmark");
		Landmark landmark = new Landmark(lm.path("kind").asString(""), lm.path("at").asDouble(0.0));

		JsonNode ch = s.path("character");
		StoryCharacter character = new StoryCharacter(
				ch.path("name").asString(""),
				ch.path("age").asInt(0),
				ch.path("role").asString(""),
				ch.path("place").asString(""),
				ch.path("savings").asString("")
		);

		String intro = s.path("intro").asString("");

		List<Word> words = new ArrayList<>();
		for (JsonNode w : s.path("words")) {
			words.add(new Word(w.path("native").asString(""), w.path("meaning").asString("")));
		}

		JsonNode cur = s.path("currency");
		Currency currency = new Currency(cur.path("code").asString(""), cur.path("perEur").asDouble(1.0));

		List<String> lessonIds = new ArrayList<>();
		for (JsonNode lid : s.path("lessonIds")) {
			lessonIds.add(lid.asString(""));
		}

		String duelFallback = s.hasNonNull("duelFallback") ? s.path("duelFallback").asString(null) : null;

		return new Story(id, category, city, topic, status, pin, icon, color, landmark, character, intro, words, currency, lessonIds, duelFallback, s);
	}
}
