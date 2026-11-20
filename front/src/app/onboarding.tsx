import Feather from '@expo/vector-icons/Feather';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
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
  motion,
  OptionCard,
  StepHeader,
  Tappable,
  type,
} from '@/components/onboarding/ui';
import {
  CONFIDENCE_AREAS,
  CONFIDENCE_LABELS,
  EXPERIENCE,
  GOAL_GROUPS,
  LEARNING_STYLES,
  LIFE_STAGES,
  type Option,
} from '@/constants/onboarding';
import { colors, radii, spacing } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { Confidence, ConfidenceArea, ConfidenceRatings, Goal, OnboardingAnswers } from '@/types/onboarding';

const STEPS = [
  'welcome',
  'intro',
  'invite',
  'life-stage',
  'goals',
  'experience',
  'learning-style',
  'confidence',
] as const;
type Step = (typeof STEPS)[number];

const QUESTIONS = ['life-stage', 'goals', 'experience', 'learning-style', 'confidence'] as const;

export default function OnboardingScreen() {
  const { complete } = useOnboarding();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({ goals: [], confidence: {} });

  const step: Step = STEPS[index];
  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));
  const finish = () => complete(answers, false);
  const skipAll = () => complete({ goals: [], confidence: {} }, true);
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
          {['Lessons matched to your goals', 'Examples from your stage of life', 'Your pace and your level of detail'].map(
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
          <Text style={type.label}>5 questions · about 1 minute</Text>
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
    'learning-style': !!answers.learningStyle,
    confidence: CONFIDENCE_AREAS.every((a) => answers.confidence[a.value]),
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
        <Question title="Where are you with saving and investing?" subtitle="No wrong answers — this just sets your starting level.">
          <SingleChoice options={EXPERIENCE} value={answers.experience} onChange={(v) => set('experience', v)} />
        </Question>
      )}
      {step === 'learning-style' && (
        <Question title="How do you like to learn?" subtitle="We'll shape every lesson around this. You can change it later in Settings.">
          <SingleChoice options={LEARNING_STYLES} value={answers.learningStyle} onChange={(v) => set('learningStyle', v)} />
        </Question>
      )}
      {step === 'confidence' && (
        <Question title="How confident do you feel about…" subtitle="1 = not at all, 5 = very confident. Rate all three.">
          <ConfidenceScales
            value={answers.confidence}
            onChange={(area, v) => set('confidence', { ...answers.confidence, [area]: v })}
          />
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

function ConfidenceScales({
  value,
  onChange,
}: {
  value: ConfidenceRatings;
  onChange: (area: ConfidenceArea, v: Confidence) => void;
}) {
  return (
    <>
      {CONFIDENCE_AREAS.map((area) => {
        const current = value[area.value];
        return (
          <View key={area.value} style={styles.scaleCard} testID={`confidence-${area.value}`}>
            <View style={[styles.row, { gap: 12 }]}>
              <IconTile icon={area.icon} active={!!current} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.areaTitle}>{area.title}</Text>
                <Text style={type.label}>{area.subtitle}</Text>
              </View>
              {current && (
                <Animated.Text key={current} style={[styles.areaValue, motion.swap]}>
                  {CONFIDENCE_LABELS[current - 1]}
                </Animated.Text>
              )}
            </View>
            <View style={styles.scale} accessibilityRole="radiogroup" accessibilityLabel={area.title}>
              {([1, 2, 3, 4, 5] as const).map((n) => {
                const selected = current === n;
                return (
                  <Tappable
                    key={n}
                    testID={`confidence-${area.value}-${n}`}
                    accessibilityRole="radio"
                    aria-checked={selected}
                    accessibilityLabel={`${n} of 5, ${CONFIDENCE_LABELS[n - 1]}`}
                    haptic="selection"
                    pressedScale={0.9}
                    onPress={() => onChange(area.value, n)}
                    containerStyle={{ flex: 1 }}
                    style={[styles.level, motion.colors, selected && styles.levelSelected]}
                  >
                    <Animated.Text
                      key={String(selected)}
                      style={[styles.levelText, selected && { color: colors.brandPrimary }, selected && motion.pop]}
                    >
                      {n}
                    </Animated.Text>
                  </Tappable>
                );
              })}
            </View>
          </View>
        );
      })}
      <View style={styles.note}>
        <Feather name="trending-up" size={18} color={colors.brandPrimary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.strong}>Why we ask</Text>
          <Text style={type.label}>
            We&apos;ll ask again as you learn, so you can see your confidence grow — not just your score.
          </Text>
        </View>
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
  scaleCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    paddingTop: 20,
    gap: 12,
  },
  scale: { flexDirection: 'row', gap: 8 },
  level: {
    flex: 1,
    height: 44,
    borderRadius: radii.tile,
    backgroundColor: colors.bgTint,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelSelected: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary },
  areaTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  areaValue: { fontSize: 12, fontWeight: '700', color: colors.feedbackSuccess },
  levelText: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  note: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.brandAccentSoft,
    borderRadius: radii.tile,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
