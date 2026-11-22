import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConsentCard } from '@/components/onboarding/ConsentCard';
import { DuelSlide } from '@/components/onboarding/DuelSlide';
import { BackButton, CloseButton } from '@/components/onboarding/HeaderButtons';
import { InterestsStep } from '@/components/onboarding/InterestsStep';
import { MapSlide } from '@/components/onboarding/MapSlide';
import { Page } from '@/components/onboarding/Page';
import { QuickCheckSlide } from '@/components/onboarding/QuickCheckSlide';
import { BigButton } from '@/components/onboarding/ui';
import { WelcomeSlide } from '@/components/onboarding/WelcomeSlide';
import { useBank } from '@/hooks/useBank';
import { useOnboarding } from '@/hooks/useOnboarding';
import { leaveOnboardingForCheck } from '@/hooks/useOpenLearn';
import { ageBandOf, ageLabel, factLabels, factsFrom } from '@/lib/categorization';
import { personaFor } from '@/lib/personas';
import { useCurrentUser } from '@/lib/user';
import type { Intake } from '@/types/onboarding';
import type { ProfileRanges } from '@/types/quickCheck';

const STEPS = ['welcome', 'intro', 'challenge', 'consent', 'interests', 'check-intro'] as const;

export default function OnboardingScreen() {
  const { userId } = useCurrentUser();
  const hints = personaFor(userId).hints;
  const { complete, done } = useOnboarding();
  const { state: bank } = useBank();
  const [index, setIndex] = useState(0);
  const [interests, setInterests] = useState<string[]>();

  const step = STEPS[index];

  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  const intake = (): Intake => {
    const profile: ProfileRanges = { ageBand: ageBandOf(bank.owner.age), savingsCover: null, horizon: null };
    return { check: { profile } };
  };

  const [checkStarted, setCheckStarted] = useState(false);
  const startCheck = () => {
    complete({ interests: interests ?? [] }, intake());
    setCheckStarted(true);
  };
  // Leave only once `done` is true in this render: /categorizing is behind the onboarding guard.
  // Works when the profile was already done too (onboarding reopened after a reload).
  useEffect(() => {
    if (checkStarted && done) leaveOnboardingForCheck();
  }, [checkStarted, done]);
  // Close and "Not now": nothing is saved, back to the bank; the next Learn tap shows onboarding again.
  const exit = () => (router.canGoBack() ? router.back() : router.navigate('/'));

  if (step === 'welcome') {
    return (
      <Page
        dark
        testID="onboarding-welcome"
        header={
          <View style={styles.row}>
            <CloseButton onPress={exit} onDark />
          </View>
        }
        footer={<BigButton label="Get started" onPress={next} testID="onboarding-start" />}
      >
        <WelcomeSlide />
      </Page>
    );
  }

  if (step === 'intro') {
    return (
      <Page
        dark
        testID="onboarding-intro"
        header={
          <View style={styles.row}>
            <BackButton onPress={back} onDark />
          </View>
        }
        footer={<BigButton label="Next" onPress={next} testID="onboarding-next" />}
      >
        <MapSlide />
      </Page>
    );
  }

  if (step === 'challenge') {
    return (
      <Page
        dark
        testID="onboarding-challenge"
        header={
          <View style={styles.row}>
            <BackButton onPress={back} onDark />
          </View>
        }
        footer={<BigButton label="Next" onPress={next} testID="onboarding-challenge-next" />}
      >
        <DuelSlide />
      </Page>
    );
  }

  if (step === 'consent') {
    return (
      <Page
        testID="onboarding-consent"
        header={
          <View style={styles.row}>
            <BackButton onPress={back} />
          </View>
        }
        footer={
          <>
            <BigButton label="Use my account data" onPress={next} testID="consent-accept" />
            <BigButton label="Not now" variant="ghost" onPress={exit} testID="consent-not-now" />
          </>
        }
      >
        <ConsentCard facts={[...factLabels(factsFrom(bank)), ageLabel(ageBandOf(bank.owner.age))]} />
      </Page>
    );
  }

  if (step === 'check-intro') {
    return (
      <Page
        testID="onboarding-check-intro"
        header={
          <View style={styles.row}>
            <BackButton onPress={back} />
          </View>
        }
        footer={<BigButton label="Start the quick check" onPress={startCheck} testID="check-start" />}
      >
        <QuickCheckSlide />
      </Page>
    );
  }

  return (
    <InterestsStep
      initial={interests ?? hints?.interests}
      onBack={back}
      onDone={(ids) => {
        setInterests(ids);
        next();
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
