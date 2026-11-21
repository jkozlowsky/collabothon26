import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/bank/Icon';
import { IconButton } from '@/components/bank/IconButton';
import { MatchmakingGlow } from '@/components/duel/MatchmakingGlow';
import { MysteryAvatar } from '@/components/duel/MysteryAvatar';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { BigButton } from '@/components/onboarding/ui';
import { colors, radii, spacing, tints, type } from '@/constants/theme';
import { formatNumber, getCategoryMeta } from '@/lib/duel/meta';
import type { DuelMatchState } from '@/lib/duel/reducer';
import type { AvatarId } from '@/types/account';

type Props = {
  state: DuelMatchState;
  youAvatar: AvatarId;
  initialElo?: number;
  initialCalibrated?: boolean;
  onCancel: () => void;
};

const MODE_LABEL = { HUMAN: 'VS HUMAN', BOT: 'VS BOT', SOLO: 'SOLO' } as const;
const TITLE = { HUMAN: 'Finding a rival…', BOT: 'Setting up your bot match…', SOLO: 'Starting your solo round…' } as const;

/** Petrol "finding a rival" screen (Figma "Duel — Matchmaking"); bot and solo get a short loading state. */
export function MatchmakingView({ state, youAvatar, initialElo, initialCalibrated = true, onCancel }: Props) {
  const cat = getCategoryMeta(state.category);
  const isHuman = state.mode === 'HUMAN';
  const eloLabel = initialElo === undefined ? 'Ranked' : initialCalibrated ? formatNumber(initialElo) : 'Calibrating';

  return (
    <SafeAreaView style={styles.screen} testID="duel-matchmaking">
      <StatusBar style="light" />
      <MatchmakingGlow />
      <View style={styles.top}>
        <IconButton icon="close" tone="onBrand" onPress={onCancel} label="Cancel matchmaking" testID="matchmaking-close" />
      </View>

      <View style={styles.body}>
        {isHuman ? (
          <View style={styles.stage}>
            <View style={styles.orbit} />
            <View style={styles.players}>
              <View style={styles.side}>
                <PlayerAvatar avatar={youAvatar} size={92} ring="accent" />
                <View style={[styles.pill, styles.pillLight]}>
                  <Icon name="trophy" size={14} color={colors.brandPrimary} />
                  <Text style={[styles.pillText, styles.pillTextDark]}>{eloLabel}</Text>
                </View>
              </View>
              <Text style={styles.vs}>VS</Text>
              <View style={styles.side}>
                <MysteryAvatar size={92} />
                <View style={[styles.pill, styles.pillDark]}>
                  <ActivityIndicator size="small" color={colors.textOnBrand} />
                  <Text style={styles.pillText}>Searching</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.simpleStage}>
            {state.mode === 'BOT' ? (
              <PlayerAvatar avatar={null} isBot size={92} />
            ) : (
              <View style={styles.soloBadge}>
                <Icon name="target" size={40} color={colors.brandAccent} />
              </View>
            )}
            <ActivityIndicator color={colors.brandAccent} />
          </View>
        )}

        <View style={styles.copy}>
          <Text style={styles.overline}>
            {MODE_LABEL[state.mode]} · {cat.name.toUpperCase()}
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {TITLE[state.mode]}
          </Text>
          {isHuman && (
            <Text style={styles.subtitle}>We look for a rival close to your Elo.</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <BigButton label="Cancel" variant="ghost" onDark onPress={onCancel} testID="matchmaking-cancel" />
      </View>
    </SafeAreaView>
  );
}

const ORBIT = 248;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandPrimary },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.xl },
  stage: { alignItems: 'center', justifyContent: 'center', minHeight: ORBIT + spacing.lg },
  orbit: {
    position: 'absolute',
    width: ORBIT,
    height: ORBIT,
    borderRadius: ORBIT / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.onBrandHairline,
  },
  players: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  side: { alignItems: 'center', gap: spacing.sm },
  vs: { ...type.displayLarge, color: colors.brandAccent, marginBottom: spacing.xxl },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill },
  pillLight: { backgroundColor: colors.bgSurface },
  pillDark: { backgroundColor: colors.onBrandChip },
  pillText: { ...type.labelStrong, color: colors.textOnBrand },
  pillTextDark: { color: colors.textOnAccent },
  simpleStage: { alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.xxl },
  soloBadge: {
    width: 92,
    height: 92,
    borderRadius: radii.pill,
    backgroundColor: tints.accent,
    borderWidth: 2,
    borderColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: spacing.sm },
  overline: { ...type.overline, color: colors.brandAccent },
  title: { ...type.displayLarge, color: colors.textOnBrand },
  subtitle: { ...type.bodyDefault, color: colors.onBrandMuted },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xs },
});
