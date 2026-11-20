import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  LessonGlobeIllustration,
  WelcomeHero,
} from '@/components/onboarding/Illustrations';
import {
  BackButton,
  BigButton,
  ChoiceChip,
  FadeIn,
  IconTile,
  OptionCard,
  StepHeader,
  type,
} from '@/components/onboarding/ui';
import {
  EXPERIENCE,
  GOAL_GROUPS,
  LIFE_STAGES,
  type Option,
} from '@/constants/onboarding';
import { colors, radii, spacing } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { Goal, OnboardingAnswers } from '@/types/onboarding';

const STEPS = [
  'welcome',
  'intro',
  'invite',
  'life-stage',
  'goals',
  'experience',
] as const;
type Step = (typeof STEPS)[number];

const QUESTIONS = ['life-stage', 'goals', 'experience'] as const;

export default function OnboardingScreen() {
  const { complete } = useOnboarding();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({ goals: [] });

  const step: Step = STEPS[index];
  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));
  const finish = () => complete(answers, false);
  const skipAll = () => complete({ goals: [] }, true);
  const set = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  if (step === 'welcome') {
    return (
      <Page dark stepKey={step} footer={<BigButton label="Get started" onPress={next} testID="onboarding-start" />}>
        <View style={styles.grow} />
        <WelcomeHero />
        <View style={{ height: spacing.xxxl }} />
        <Text style={[type.overline, { color: colors.brandAccent }]}>FINANCE QUEST</Text>
        <Text style={[styles.welcomeTitle]}>Finances with confidence — one lesson at a time</Text>
        <Text style={[type.body, { color: 'rgba(255,255,255,0.75)' }]}>
          Short lessons built around your own money. A few minutes a day is enough.
        </Text>
        <View style={styles.grow} />
      </Page>
    );
  }

  if (step === 'intro') {
    return (
      <Page
        stepKey={step}
        header={
          <View style={styles.row}>
            <BackButton onPress={back} />
          </View>
        }
        footer={<BigButton label="Next" onPress={next} testID="onboarding-next" />}
      >
        <LessonGlobeIllustration />
        <View style={{ height: spacing.xxxl }} />
        <Text style={type.display}>A world of money lessons</Text>
        <Text style={type.body}>
          Budgeting, saving, borrowing, investing, spotting scams. Every pin is a short path of 2–5 minute lessons set in
          a real place — from tulip mania in Amsterdam to saving on the go in Nairobi.
        </Text>
      </Page>
    );
  }

  if (step === 'invite') {
    return (
      <Page
        stepKey={step}
        footer={
          <>
            <BigButton label="Let's do it" onPress={next} testID="onboarding-personalise" />
            <BigButton label="Skip for now" variant="ghost" onPress={skipAll} testID="onboarding-skip-all" />
            <Text style={[type.label, { textAlign: 'center' }]}>You can personalise any time later in Profile.</Text>
          </>
        }
      >
        <View style={styles.grow} />
        <IconTile icon="user" active size={64} />
        <View style={{ height: spacing.sm }} />
        <Text style={type.overline}>PERSONALISE · OPTIONAL</Text>
        <Text style={type.display}>Got a minute for a few questions?</Text>
        <Text style={type.body}>
          Tell us about your goals and how you like to learn, and we&apos;ll shape your path around you. No tests, no
          wrong answers.
        </Text>
        <View style={styles.benefits}>
          {['Lessons matched to your goals', 'Examples from your stage of life', 'A starting level that fits you'].map(
            (b) => (
              <View key={b} style={styles.benefit}>
                <View style={styles.benefitCheck}>
                  <Feather name="check" size={14} color={colors.feedbackSuccess} />
                </View>
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ),
          )}
        </View>
        <View style={[styles.row, { justifyContent: 'center', gap: 6 }]}>
          <Feather name="clock" size={14} color={colors.textMuted} />
          <Text style={type.label}>3 questions · under a minute</Text>
        </View>
        <View style={styles.grow} />
      </Page>
    );
  }

  // Personalisation questions
  const qIndex = QUESTIONS.indexOf(step);
  const isLast = qIndex === QUESTIONS.length - 1;
  const answered = {
    'life-stage': !!answers.lifeStage,
    goals: answers.goals.length > 0,
    experience: !!answers.experience,
  }[step];

  return (
    <Page
      stepKey={step}
      header={<StepHeader step={qIndex + 1} total={QUESTIONS.length} onBack={back} onSkip={finish} />}
      footer={
        <BigButton
          label={isLast ? 'Finish' : 'Continue'}
          onPress={isLast ? finish : next}
          disabled={!answered}
          testID="onboarding-continue"
        />
      }
    >
      {step === 'life-stage' && (
        <Question title="Where are you in life right now?" subtitle="We use this to pick examples that feel familiar. Change it any time.">
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
    </Page>
  );
}

type PageProps = { stepKey: Step; dark?: boolean; header?: ReactNode; footer: ReactNode; children: ReactNode };

function Page({ stepKey, dark, header, footer, children }: PageProps) {
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: dark ? colors.brandPrimary : colors.bgCanvas }]}
      testID={`onboarding-${stepKey}`}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      {header && <View style={styles.header}>{header}</View>}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn key={stepKey} style={styles.content}>
          {children}
        </FadeIn>
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </SafeAreaView>
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
      <View style={[styles.row, { justifyContent: 'flex-start', gap: 8 }]}>
        <Feather name="check" size={16} color={value.length ? colors.feedbackSuccess : colors.textMuted} />
        <Text style={[type.strong, { color: value.length ? colors.feedbackSuccess : colors.textMuted }]}>
          {value.length} selected
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg },
  content: { flexGrow: 1, gap: 10 },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  grow: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700', color: '#fff' },
  answers: { gap: 10, marginTop: spacing.lg },
  goalGroup: { gap: spacing.xs + spacing.xxs },
  goalGroupTitle: { ...type.overline, color: colors.textMuted, textTransform: 'uppercase' },
  goalRow: { flexDirection: 'row', gap: spacing.sm },
  benefits: {
    marginTop: spacing.lg,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: 14,
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 138, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
});
