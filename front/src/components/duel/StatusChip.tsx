import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, elevation, radii, spacing, tints, type } from '@/constants/theme';
import type { BankIconName } from '@/types/bank';

/** Figma "Stat Chip" plus the duel status variants (Duel · Design Kit additions). */
export type ChipTone = 'xp' | 'streak' | 'success' | 'elo' | 'timer' | 'timerUrgent' | 'offline' | 'online' | 'bot' | 'calibrating';

type Props = {
  label: string;
  tone: ChipTone;
  icon?: BankIconName;
  /** A small status dot instead of an icon ("Online"). */
  dot?: boolean;
  testID?: string;
};

type Palette = { bg: string; text: string; icon: string; raised?: boolean };

// White chips float on the canvas (stat chips); tinted ones carry a status colour.
const PALETTE: Record<ChipTone, Palette> = {
  xp: { bg: colors.bgSurface, text: colors.textPrimary, icon: colors.feedbackXp, raised: true },
  streak: { bg: colors.bgSurface, text: colors.textPrimary, icon: colors.feedbackStreak, raised: true },
  success: { bg: colors.bgSurface, text: colors.textPrimary, icon: colors.feedbackSuccess, raised: true },
  elo: { bg: colors.bgSurface, text: colors.textPrimary, icon: colors.brandPrimary, raised: true },
  timer: { bg: colors.brandAccentSoft, text: colors.brandPrimary, icon: colors.brandPrimary },
  timerUrgent: { bg: colors.feedbackDangerSoft, text: colors.feedbackDanger, icon: colors.feedbackDanger },
  offline: { bg: colors.feedbackDangerSoft, text: colors.feedbackDanger, icon: colors.feedbackDanger },
  online: { bg: colors.feedbackSuccessSoft, text: colors.feedbackSuccess, icon: colors.feedbackSuccess },
  bot: { bg: tints.violet, text: colors.storyViolet, icon: colors.storyViolet },
  calibrating: { bg: colors.brandPrimarySoft, text: colors.textMuted, icon: colors.textMuted },
};

/** Small pill with an icon and a short label: XP, streak, score, timer, connection state. */
export function StatusChip({ label, tone, icon, dot, testID }: Props) {
  const p = PALETTE[tone];
  return (
    <View style={[styles.chip, { backgroundColor: p.bg }, p.raised && styles.raised]} testID={testID}>
      {dot && <View style={[styles.dot, { backgroundColor: p.icon }]} />}
      {icon && <Icon name={icon} size={14} color={p.icon} />}
      <Text style={[styles.label, { color: p.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  raised: { borderWidth: 1, borderColor: colors.borderDefault, ...elevation.low },
  dot: { width: 7, height: 7, borderRadius: radii.pill },
  label: type.labelStrong,
});
