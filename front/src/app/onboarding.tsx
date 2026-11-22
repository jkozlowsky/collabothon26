import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerTile } from '@/components/categorizing/AnswerTile';
import { ConsentCard } from '@/components/onboarding/ConsentCard';
import { AtlasHero, DuelIllustration, LessonGlobeIllustration, QuickCheckHero } from '@/components/onboarding/Illustrations';
import { Page } from '@/components/onboarding/Page';
import {
  BackButton,
  BigButton,
  CloseButton,
  OptionCard,
  Rise,
  StepHeader,
  type,
} from '@/components/onboarding/ui';
import { PURPOSES, type Option } from '@/constants/onboarding';
import { PROFILE_QUESTIONS } from '@/constants/quickCheck';
import { colors, spacing, type as text } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { useOnboarding } from '@/hooks/useOnboarding';
import { leaveOnboardingForCheck } from '@/hooks/useOpenLearn';
import { ageBandOf, ageLabel, factLabels, factsFrom } from '@/lib/categorization';
import { personaFor } from '@/lib/personas';
import { useCurrentUser } from '@/lib/user';
import type { Intake, OnboardingAnswers, Purpose } from '@/types/onboarding';
import type { Horizon, ProfileRanges } from '@/types/quickCheck';

type Step =
  | 'welcome'
  | 'intro'
  | 'challenge'
  | 'consent'
  | 'purpose'
  | 'horizon'
  | 'check-intro';

const STEPS: Step[] = ['welcome', 'intro', 'challenge', 'consent', 'purpose', 'horizon', 'check-intro'];
const QUESTIONS: Step[] = ['purpose', 'horizon'];

/** Everything the survey collects; the profile keeps the goals the purpose stands for. */
type Survey = OnboardingAnswers & {
  purpose?: Purpose;
  horizon?: Horizon;
};

export default function OnboardingScreen() {
  const { userId } = useCurrentUser();
  const hints = personaFor(userId).hints;
  const { complete, done } = useOnboarding();
  const { state: bank } = useBank();
  const [index, setIndex] = useState(0);
  // A demo persona starts with its answers preselected.
  const [answers, setAnswers] = useState<Survey>({ goals: [], purpose: hints?.purpose, horizon: hints?.horizon });

  const step = STEPS[index];
  const purpose = PURPOSES.find((p) => p.value === answers.purpose);

  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));
  const set = <K extends keyof Survey>(key: K, value: Survey[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  const intake = (): Intake => {
    const horizon = answers.horizon ?? null;
    const profile: ProfileRanges = { ageBand: ageBandOf(bank.owner.age), savingsCover: null, horizon };
    return {
      purpose: purpose && purpose.value !== 'none' ? purpose.title : null,
      horizon,
      check: { profile },
    };
  };

  // The purpose goes on the profile as its goals.
  const [checkStarted, setCheckStarted] = useState(false);
  const startCheck = () => {
    complete({ goals: purpose?.goals ?? [] }, intake());
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
        <View style={styles.grow} />
        <AtlasHero />
        <View style={{ height: spacing.xl }} />
        <Rise delay={250}>
          <Text style={styles.welcomeOverline}>WELCOME TO</Text>
        </Rise>
        <Rise delay={350}>
          <Text style={styles.wordmark} accessibilityRole="header">
            Atlas<Text style={styles.wordmarkDot}>.</Text>
          </Text>
        </Rise>
        <Rise delay={420}>
          <Text style={styles.motto} testID="atlas-motto">
            Atlas lets your financial decisions land safely.
          </Text>
        </Rise>
        <View style={styles.grow} />
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
        <View style={styles.grow} />
        <LessonGlobeIllustration />
        <View style={{ height: spacing.xl }} />
        <Rise delay={300}>
          <Text style={styles.welcomeOverline}>LEARN · THE MAP</Text>
        </Rise>
        <Rise delay={400}>
          <Text style={[type.display, { color: colors.textOnBrand }]}>Every pin is a field of finance</Text>
        </Rise>
        <View style={styles.grow} />
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
        <View style={styles.grow} />
        <DuelIllustration />
        <View style={{ height: spacing.xl }} />
        <Rise delay={300}>
          <Text style={[type.overline, { color: colors.brandAccent }]}>CHALLENGE · DUELS</Text>
        </Rise>
        <Rise delay={400}>
          <Text style={[type.display, { color: colors.textOnBrand }]}>Put what you know to the test</Text>
        </Rise>
        <View style={styles.grow} />
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
        <View style={styles.grow} />
        <QuickCheckHero />
        <View style={styles.gap} />
        <Text style={type.overline}>QUICK CHECK · 3–6 QUESTIONS</Text>
        <Text style={type.display} accessibilityRole="header">
          Let&apos;s see what you already know
        </Text>
        <View style={styles.meta}>
          <Feather name="clock" size={14} color={colors.textMuted} />
          <Text style={type.label}>About 2 minutes</Text>
        </View>
        <View style={styles.growDouble} />
      </Page>
    );
  }

  const qIndex = QUESTIONS.indexOf(step);
  const answered: Partial<Record<Step, boolean>> = {
    purpose: !!answers.purpose,
    horizon: !!answers.horizon,
  };

  return (
    <Page
      testID={`onboarding-${step}`}
      header={
        <StepHeader
          left={<BackButton onPress={back} />}
          label={`Step ${qIndex + 1} of ${QUESTIONS.length}`}
          progress={(qIndex + 1) / QUESTIONS.length}
        />
      }
      footer={
        <BigButton
          label="Continue"
          onPress={next}
          disabled={!answered[step]}
          testID="onboarding-continue"
        />
      }
    >
      {step === 'purpose' && (
        <Question title="What are you saving for?">
          <SingleChoice options={PURPOSES} value={answers.purpose} onChange={(v) => set('purpose', v)} />
        </Question>
      )}
      {step === 'horizon' && (
        <Question title={PROFILE_QUESTIONS.horizon.prompt}>
          <RangeChoice options={PROFILE_QUESTIONS.horizon.options} value={answers.horizon} onChange={(v) => set('horizon', v)} />
        </Question>
      )}
    </Page>
  );
}

function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Text style={type.display}>{title}</Text>
      <View style={styles.answers}>{children}</View>
    </>
  );
}

function SingleChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value?: T;
  onChange: (v: T) => void;
}) {
  return options.map((o) => (
    <OptionCard
      key={o.value}
      testID={`option-${o.value}`}
      title={o.title}
      subtitle={o.subtitle}
      icon={o.icon}
      selected={value === o.value}
      onPress={() => onChange(o.value)}
    />
  ));
}

/** The range questions: `OptionCard`s without an icon. */
function RangeChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value?: T;
  onChange: (v: T) => void;
}) {
  return options.map((o) => (
    <AnswerTile
      key={o.value}
      testID={`option-${o.value}`}
      title={o.label}
      state={value === o.value ? 'selected' : 'default'}
      checked={value === o.value}
      onPress={() => onChange(o.value)}
    />
  ));
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
  growDouble: { flexGrow: 2 },
  gap: { height: spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2 },
  welcomeOverline: { ...text.overline, color: colors.brandAccent, letterSpacing: 3 },
  wordmark: { ...text.displayHero, color: colors.textOnBrand },
  wordmarkDot: { color: colors.brandAccent },
  motto: { ...text.titleSection, color: colors.brandAccent, marginTop: -spacing.xs },
  answers: { gap: spacing.smPlus, marginTop: spacing.lg },
});
