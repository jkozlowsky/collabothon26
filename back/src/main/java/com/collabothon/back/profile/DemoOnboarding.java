package com.collabothon.back.profile;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Every demo starts with a demo user who has never seen onboarding, so the first Learn tap runs it.
 * The answers given during the demo are saved on the profile as usual and stay until the next
 * backend start. Turn off with {@code finance-quest.demo.reset-onboarding-on-startup=false}.
 */
@Component
@ConditionalOnProperty(name = "finance-quest.demo.reset-onboarding-on-startup", havingValue = "true",
		matchIfMissing = true)
class DemoOnboarding implements ApplicationRunner {

	private final UserProfileRepository profiles;

	DemoOnboarding(UserProfileRepository profiles) {
		this.profiles = profiles;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		profiles.findById(DemoProgress.DEMO_USER).ifPresent(UserProfile::resetOnboarding);
	}

}
