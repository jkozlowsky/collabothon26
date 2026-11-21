import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnswerTile } from '@/components/categorizing/AnswerTile';
import { ConfidenceScale } from '@/components/onboarding/ConfidenceScale';
import { ConsentCard } from '@/components/onboarding/ConsentCard';
import { LessonGlobeIllustration, QuickCheckHero, WelcomeHero } from '@/components/onboarding/Illustrations';
import { Page } from '@/components/onboarding/Page';
import {
  BackButton,
  BigButton,
  ChoiceChip,
  CloseButton,
  OptionCard,
  SkipLink,
  StepHeader,
  type,
} from '@/components/onboarding/ui';
import { EXPERIENCE, GOAL_GROUPS, LIFE_STAGES, PURPOSES, type Option } from '@/constants/onboarding';
import { PROFILE_QUESTIONS } from '@/constants/quickCheck';
import { colors, fonts, spacing } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ageBandOf, ageLabel, factLabels, factsFrom } from '@/lib/categorization';
import type { Goal, Intake, OnboardingAnswers, Purpose } from '@/types/onboarding';
import type { ConfidenceRating, Horizon, ProfileRanges } from '@/types/quickCheck';

type Step =
  | 'welcome'
  | 'intro'
  | 'consent'
  | 'life-stage'
  | 'experience'
  | 'savings-cover'
  | 'goals'
  | 'purpose'
  | 'horizon'
  | 'confidence'
  | 'check-intro';

const OPENING: Step[] = ['welcome', 'intro', 'consent'];
/** Asked only without account access: with it, the account already shows these. */
const WITHOUT_ACCOUNT: Step[] = ['life-stage', 'experience', 'savings-cover'];
const CLOSING: Step[] = ['purpose', 'horizon', 'confidence', 'check-intro'];
/** Profile → "Edit answers". */
const EDITING: Step[] = ['life-stage', 'goals', 'experience'];
const NOT_QUESTIONS: Step[] = [...OPENING, 'check-intro'];

/** Everything the survey collects; the profile keeps the life stage, the goals and the experience. */
type Survey = OnboardingAnswers & {
  purpose?: Purpose;
  savingsCover?: NonNullable<ProfileRanges['savingsCover']>;
  horizon?: Horizon;
  rating?: ConfidenceRating;
};

const CONFIDENCE_QUESTION = 'How confident do you feel making your own money decisions?';

export default function OnboardingScreen() {
  const { complete, answers: saved } = useOnboarding();
  const { state: bank } = useBank();
  // Profile → "Edit answers": straight to the questions, prefilled, and back to the profile when done.
  const editing = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const [index, setIndex] = useState(0);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Survey>(editing ? saved : { goals: [] });

  const steps = editing ? EDITING : [...OPENING, ...(consent === false ? WITHOUT_ACCOUNT : []), ...CLOSING];
  const questions = steps.filter((s) => !NOT_QUESTIONS.includes(s));
  const step = steps[index];
  const purpose = PURPOSES.find((p) => p.value === answers.purpose);

  const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => (editing && index === 0 ? router.back() : setIndex((i) => Math.max(i - 1, 0)));
  const decide = (withConsent: boolean) => {
    setConsent(withConsent);
    next();
  };
  const set = <K extends keyof Survey>(key: K, value: Survey[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  /** What goes on the profile: the purpose as its goals, and the two answers only a run without account access asks. */
  const profileAnswers = (): OnboardingAnswers => ({
    ...(consent === false && { lifeStage: answers.lifeStage, experience: answers.experience }),
    goals: purpose?.goals ?? [],
  });
  const intake = (startCheck: boolean): Intake | undefined => {
    if (consent === null) return undefined;
    const horizon = answers.horizon ?? null;
    const profile: ProfileRanges = {
      ageBand: consent ? ageBandOf(bank.owner.age) : null,
      savingsCover: consent ? null : (answers.savingsCover ?? null),
      horizon,
    };
    return {
      consent,
      purpose: purpose && purpose.value !== 'none' ? purpose.title : null,
      horizon,
      check: startCheck && answers.rating ? { profile, rating: answers.rating } : null,
    };
  };

  const finishEditing = () => {
    complete({ lifeStage: answers.lifeStage, goals: answers.goals, experience: answers.experience }, false);
    router.back();
  };
  const startCheck = () => complete(profileAnswers(), false, intake(true));
  // Skip in the survey: the answers so far are kept, and the path is built without the quick check.
  const skip = () => (editing ? finishEditing() : complete(profileAnswers(), false, intake(false)));
  // Skip before the consent: onboarding counts as done (nothing personalised) and Learn opens.
  const skipAll = () => complete({ goals: [] }, true);
  // Close: nothing is saved, back to the bank; the next Learn tap shows onboarding again.
  const exit = () => (router.canGoBack() ? router.back() : router.navigate('/'));

  if (step === 'welcome') {
    return (
      <Page
        dark
        testID="onboarding-welcome"
        header={
          <View style={styles.row}>
            <CloseButton onPress={exit} onDark />
            <SkipLink onPress={skipAll} onDark testID="onboarding-skip-intro" />
          </View>
        }
        footer={<BigButton label="Get started" onPress={next} testID="onboarding-start" />}
      >
        <View style={styles.grow} />
        <WelcomeHero />
        <View style={styles.gap} />
        <Text style={[type.overline, styles.onDarkAccent]}>FINANCE QUEST</Text>
        <Text style={styles.welcomeTitle}>Finances with confidence — one lesson at a time</Text>
        <Text style={[type.body, styles.onDarkMuted]}>
          Short lessons built around your own money. A few minutes a day is enough.
        </Text>
        <View style={styles.grow} />
      </Page>
    );
  }

  if (step === 'intro') {
    return (
      <Page
        testID="onboarding-intro"
        header={
          <View style={styles.row}>
            <BackButton onPress={back} />
            <SkipLink onPress={skipAll} testID="onboarding-skip-intro" />
          </View>
        }
        footer={<BigButton label="Next" onPress={next} testID="onboarding-next" />}
      >
        <LessonGlobeIllustration />
        <View style={styles.gap} />
        <Text style={type.display}>A world of money lessons</Text>
        <Text style={type.body}>
          Budgeting, saving, borrowing, investing, spotting scams. Every pin is a short path of 2–5 minute lessons set in
          a real place — from tulip mania in Amsterdam to saving on the go in Nairobi.
        </Text>
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
            <BigButton label="Use my account data" onPress={() => decide(true)} testID="consent-accept" />
            <BigButton label="Continue without" variant="ghost" onPress={() => decide(false)} testID="consent-decline" />
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
        footer={
          <>
            <BigButton label="Start the quick check" onPress={startCheck} testID="check-start" />
            <BigButton label="Skip for now" variant="ghost" onPress={skip} testID="check-skip" />
          </>
        }
      >
        <View style={styles.grow} />
        <QuickCheckHero />
        <View style={styles.gap} />
        <Text style={type.overline}>QUICK CHECK · 3–6 QUESTIONS</Text>
        <Text style={type.display} accessibilityRole="header">
          Let&apos;s see what you already know
        </Text>
        <Text style={type.body}>Pick an answer and you see the right one straight away. Nothing here can be failed.</Text>
        <View style={styles.meta}>
          <Feather name="clock" size={14} color={colors.textMuted} />
          <Text style={type.label}>About 2 minutes</Text>
        </View>
        <View style={styles.grow} />
      </Page>
    );
  }

  const qIndex = questions.indexOf(step);
  const lastEdit = editing && qIndex === questions.length - 1;
  const answered: Partial<Record<Step, boolean>> = {
    'life-stage': !!answers.lifeStage,
    goals: answers.goals.length > 0,
    experience: !!answers.experience,
    'savings-cover': !!answers.savingsCover,
    purpose: !!answers.purpose,
    horizon: !!answers.horizon,
    confidence: !!answers.rating,
  };

  return (
    <Page
      testID={`onboarding-${step}`}
      header={
        <StepHeader
          left={<BackButton onPress={back} />}
          label={`Step ${qIndex + 1} of ${questions.length}`}
          progress={(qIndex + 1) / questions.length}
          onSkip={skip}
        />
      }
      footer={
        <BigButton
          label={lastEdit ? 'Finish' : 'Continue'}
          onPress={lastEdit ? finishEditing : next}
          disabled={!answered[step]}
          testID="onboarding-continue"
        />
      }
    >
      {step === 'life-stage' && (
        <Question title="Where are you in life?" subtitle="We use this to pick examples that feel familiar. Change it any time.">
          <SingleChoice options={LIFE_STAGES} value={answers.lifeStage} onChange={(v) => set('lifeStage', v)} />
        </Question>
      )}
      {step === 'goals' && (
        <Question title="What do you want to get better at?" subtitle="Pick as many as you like. We'll build your path around them.">
          <GoalPicker value={answers.goals} onChange={(v) => set('goals', v)} />
        </Question>
      )}
      {step === 'experience' && (
        <Question title="How do you manage your money today?" subtitle="No wrong answers — this just sets your starting level.">
          <SingleChoice options={EXPERIENCE} value={answers.experience} onChange={(v) => set('experience', v)} />
        </Question>
      )}
      {step === 'savings-cover' && (
        <Question title={PROFILE_QUESTIONS.savingsCover.prompt} subtitle={`${PROFILE_QUESTIONS.savingsCover.why}.`}>
          <RangeChoice options={PROFILE_QUESTIONS.savingsCover.options} value={answers.savingsCover} onChange={(v) => set('savingsCover', v)} />
        </Question>
      )}
      {step === 'purpose' && (
        <Question title="What are you saving for?" subtitle="Pick the one that fits best. It shapes your first lessons.">
          <SingleChoice options={PURPOSES} value={answers.purpose} onChange={(v) => set('purpose', v)} />
        </Question>
      )}
      {step === 'horizon' && (
        <Question title={PROFILE_QUESTIONS.horizon.prompt} subtitle={`${PROFILE_QUESTIONS.horizon.why}.`}>
          <RangeChoice options={PROFILE_QUESTIONS.horizon.options} value={answers.horizon} onChange={(v) => set('horizon', v)} />
        </Question>
      )}
      {step === 'confidence' && (
        <>
          <Text style={type.display} accessibilityRole="header">
            {CONFIDENCE_QUESTION}
          </Text>
          <ConfidenceScale label={CONFIDENCE_QUESTION} value={answers.rating ?? null} onChange={(v) => set('rating', v)} />
        </>
      )}
    </Page>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <>
      <Text style={type.display}>{title}</Text>
      {subtitle && <Text style={type.body}>{subtitle}</Text>}
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

function GoalPicker({ value, onChange }: { value: Goal[]; onChange: (v: Goal[]) => void }) {
  const toggle = (g: Goal) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  return (
    <>
      {GOAL_GROUPS.map((group) => (
        <View key={group.title} style={styles.goalGroup}>
          <Text style={styles.goalGroupTitle} accessibilityRole="header">
            {group.title}
          </Text>
          <View style={styles.goalRow}>
            {group.goals.map((g) => (
              <ChoiceChip
                key={g.value}
                testID={`goal-${g.value}`}
                label={g.label}
                selected={value.includes(g.value)}
                onPress={() => toggle(g.value)}
              />
            ))}
          </View>
        </View>
      ))}
      <View style={styles.selected}>
        <Feather name="check" size={16} color={value.length ? colors.feedbackSuccess : colors.textMuted} />
        <Text style={[type.strong, { color: value.length ? colors.feedbackSuccess : colors.textMuted }]}>
          {value.length} selected
        </Text>
      </View>
    </>
  );
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
  gap: { height: spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2 },
  welcomeTitle: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, color: colors.textOnBrand },
  onDarkAccent: { color: colors.brandAccent },
  onDarkMuted: { color: colors.onBrandMuted },
  answers: { gap: spacing.smPlus, marginTop: spacing.lg },
  goalGroup: { gap: spacing.xs + spacing.xxs },
  goalGroupTitle: { ...type.overline, color: colors.textMuted, textTransform: 'uppercase' },
  goalRow: { flexDirection: 'row', gap: spacing.sm },
  selected: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
