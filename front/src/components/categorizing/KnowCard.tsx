import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { IconTile } from '@/components/onboarding/ui';
import type { IconName } from '@/constants/onboarding';
import { GLYPH, HAIRLINE } from '@/constants/path';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  /** The life stage the user told us, null when skipped. */
  lifeStage: string | null;
  /** The goals the user picked, in words; empty when skipped. */
  goals: string[];
  /** The account facts in plain words when the user allowed them, null without consent. */
  facts: string[] | null;
};

type Source = 'told' | 'skipped' | 'accounts' | 'chose';
const SOURCE: Record<Source, { label: string; icon: IconName }> = {
  told: { label: 'You told us', icon: 'user' },
  skipped: { label: 'You skipped this', icon: 'x' },
  accounts: { label: 'From your accounts', icon: 'lock' },
  chose: { label: 'You chose this', icon: 'x' },
};

type RowProps = { icon: IconName; lines: string[]; source: Source; hint?: string; testID: string; first?: boolean };

function Row({ icon, lines, source, hint, testID, first }: RowProps) {
  const { label, icon: sourceIcon } = SOURCE[source];
  return (
    <View style={[styles.row, first && styles.first]} testID={testID}>
      <IconTile icon={icon} size={32} />
      <View style={styles.text}>
        {lines.map((line) => (
          <Text key={line} style={type.titleCard}>
            {line}
          </Text>
        ))}
        <View style={styles.meta}>
          <View style={styles.tag}>
            <Feather name={sourceIcon} size={12} color={colors.brandPrimary} />
            <Text style={styles.tagText}>{label}</Text>
          </View>
          {hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
      </View>
    </View>
  );
}

/** What the app knows before the first question, and where each part comes from. */
export function KnowCard({ lifeStage, goals, facts }: Props) {
  return (
    <>
      <View style={styles.head}>
        <IconTile icon="eye" size={32} />
        <Text style={styles.overline}>Before the first question</Text>
      </View>
      <Text style={type.displayLarge} accessibilityRole="header">
        What we know about you
      </Text>
      <View style={styles.card} testID="know-card">
        {lifeStage ? (
          <Row icon="user" lines={[lifeStage]} source="told" first testID="know-life-stage" />
        ) : (
          <Row icon="user" lines={['Life stage not shared']} source="skipped" hint="We will ask one question." testID="know-life-stage" first />
        )}
        {goals.length ? (
          <Row icon="flag" lines={[`Goals: ${goals.join(', ')}`]} source="told" testID="know-goals" />
        ) : (
          <Row icon="flag" lines={['Goals not shared']} source="skipped" testID="know-goals" />
        )}
        {facts ? (
          <Row icon="lock" lines={facts} source="accounts" testID="know-facts" />
        ) : (
          <Row icon="lock" lines={['Account access is off']} source="chose" hint="We will ask about your savings." testID="know-facts" />
        )}
      </View>
      <View style={styles.note}>
        <Feather name="lock" size={GLYPH} color={colors.brandPrimary} />
        <Text style={styles.noteText}>Ranges only, never exact amounts. Your questions use the exact numbers on this phone.</Text>
      </View>
      <Text style={styles.noteText} testID="know-ai-line">
        Your choices are checked by an AI service.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.smPlus },
  overline: { ...type.overline, color: colors.textMuted },
  card: {
    paddingHorizontal: spacing.mdPlus,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: HAIRLINE,
    borderColor: colors.borderDefault,
  },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.smPlus, borderTopWidth: HAIRLINE, borderTopColor: colors.borderDefault },
  first: { borderTopWidth: 0 },
  text: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.brandPrimarySoft,
  },
  tagText: { ...type.labelStrong, color: colors.brandPrimary },
  hint: { ...type.labelDefault, color: colors.textMuted },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: { ...type.labelDefault, color: colors.textMuted, flexShrink: 1 },
});
