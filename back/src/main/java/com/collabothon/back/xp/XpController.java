package com.collabothon.back.xp;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/xp")
@RequiredArgsConstructor
public class XpController {

	private final XpService xpService;

	@GetMapping("/{userId}/categories")
	public List<CategoryXpDto> categories(@PathVariable String userId) {
		return xpService.categoryBreakdown(userId);
	}

}
