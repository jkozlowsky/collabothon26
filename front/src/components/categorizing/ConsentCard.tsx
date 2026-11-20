import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { IconTile } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

type Props = {
  /** The account facts in plain words; null when the user has no bank accounts. */
  facts: string[] | null;
};

const ANSWERS = ['Where you are in life', 'Your goals', 'Your experience', 'How you like to learn', 'How confident you feel'];

const COPY = {
  facts: {
    title: 'This is all your account would share',
    line: 'Only these summaries are shared, never your transactions.',
    slip: "Shared with Finance Quest's lesson picker",
  },
  none: {
    title: 'No account data to use',
    line: 'Nothing from your bank is shared',
    slip: "Sent to Finance Quest's lesson picker",
  },
};

/** The bank's boundary: what stays inside above the dashed line, the slip of summaries that crosses it below. */
export function ConsentCard({ facts }: Props) {
  const copy = facts ? COPY.facts : COPY.none;
  return (
    <>
      <View style={styles.head}>
        <IconTile icon="lock" size={32} />
        <Text style={styles.overline}>Your account · optional</Text>
      </View>
      <Text style={type.displayLarge} accessibilityRole="header">
        {copy.title}
      </Text>

      {facts ? (
        <View style={styles.vault}>
          <Text style={type.labelStrong}>Stays in your bank</Text>
          <Text style={type.labelDefault}>Every transaction, amount, payee and date</Text>
          <View style={styles.redacted} aria-hidden>
            {[120, 90].map((w) => (
              <View key={w} style={styles.vrow}>
                <View style={styles.vicon} />
                <View style={[styles.vbar, { width: w }]} />
                <View style={[styles.vbar, styles.vamount]} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.body}>
            We found no bank accounts for this profile. Your answers are enough to pick your first lessons.
          </Text>
          <View style={[styles.vault, styles.vaultEmpty]}>
            <Text style={type.labelStrong}>No accounts found</Text>
            <Text style={type.labelDefault}>Nothing from a bank crosses the line.</Text>
          </View>
        </>
      )}

      <View style={styles.line}>
        <View style={styles.dash} />
        <View style={styles.promise}>
          <Feather name="lock" size={16} color={colors.brandPrimary} />
          <Text style={styles.promiseText}>{copy.line}</Text>
        </View>
      </View>

      <View style={styles.slip} testID="consent-slip">
        <Text style={type.labelStrong}>
          {copy.slip}
          {facts && <Text style={styles.muted}> · last 3 months</Text>}
        </Text>
        <View style={styles.pills}>
          {(facts ?? ANSWERS).map((p) => (
            <Text key={p} style={styles.pill}>
              {p}
            </Text>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.smPlus },
  overline: { ...type.overline, color: colors.textMuted },
  body: { ...type.bodyDefault, color: colors.textMuted },
  vault: {
    backgroundColor: colors.bgTint,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.mdPlus,
  },
  vaultEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  redacted: { marginTop: spacing.sm, gap: spacing.sm },
  vrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.smPlus, height: 20 },
  vicon: { width: 20, height: 20, borderRadius: radii.bar, backgroundColor: colors.borderStrong },
  vbar: { height: 8, borderRadius: radii.pill, backgroundColor: colors.borderStrong },
  vamount: { width: 48, marginLeft: 'auto' },
  line: { justifyContent: 'center', alignItems: 'center' },
  dash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.mdPlus,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    ...elevation.low,
  },
  promiseText: { ...type.labelStrong, color: colors.brandPrimary, flexShrink: 1 },
  slip: {
    padding: spacing.mdPlus,
    gap: spacing.smPlus,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...elevation.low,
  },
  muted: { ...type.labelDefault, color: colors.textMuted },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    ...type.labelDefault,
    color: colors.brandPrimary,
    backgroundColor: colors.brandPrimarySoft,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.smPlus,
    overflow: 'hidden',
  },
});
