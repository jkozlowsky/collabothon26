package com.collabothon.back.profile;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import com.collabothon.back.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class DemoOnboardingTests {

	@Autowired
	UserProfileRepository profiles;

	@Autowired
	DemoOnboarding demoOnboarding;

	@Test
	void startupClearsTheDemoUsersOnboardingButLeavesOtherUsersAlone() {
		UserProfile demo = new UserProfile(DemoProgress.DEMO_USER);
		demo.completeOnboarding("building", List.of("budget"), "regular", false);
		profiles.save(demo);
		UserProfile other = new UserProfile("frank");
		other.completeOnboarding("settled", List.of("retirement"), "planning", false);
		profiles.save(other);

		demoOnboarding.run(null);

		UserProfile demoAfter = profiles.findById(DemoProgress.DEMO_USER).orElseThrow();
		assertThat(demoAfter.isOnboardingCompleted()).isFalse();
		assertThat(demoAfter.getLifeStage()).isNull();
		assertThat(demoAfter.getGoals()).isEmpty();
		assertThat(profiles.findById("frank").orElseThrow().isOnboardingCompleted()).isTrue();
	}

}
