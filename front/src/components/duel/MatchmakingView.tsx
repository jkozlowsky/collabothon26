import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Button } from '@/components/Button';
import { DuelPage } from '@/components/duel/DuelPage';
import { LiveBadge } from '@/components/duel/LiveBadge';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, radii, spacing, type } from '@/constants/theme';
import { formatPlayerName, getStoryCategoryMeta } from '@/lib/duel/meta';
import type { AvatarId } from '@/types/account';
import type { DuelMatchState } from '@/lib/duel/reducer';
import type { MatchSearch } from '@/lib/duel/useDuelMatch';

type Props = {
  state: DuelMatchState;
  youAvatar: AvatarId;
  onCancel: () => void;
  /** The live rival search; without it the view shows the plain "Searching" state. */
  search?: MatchSearch;
};

const SEARCH_SECONDS = 15;
const RING_SIZE = 64;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Seconds left of the server's 15 s search; the full 15 until the server confirms it queued us. */
function useSecondsLeft(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (deadline === null) return SEARCH_SECONDS;
  return Math.max(0, Math.min(SEARCH_SECONDS, Math.ceil((deadline - now) / 1000)));
}

/** The countdown ring where the rival's avatar will appear. */
function SearchRing({ secondsLeft }: { secondsLeft: number }) {
  const progress = secondsLeft / SEARCH_SECONDS;
  return (
    <View style={styles.rivalSearchCircle} testID="matchmaking-ring" accessibilityLabel={`${secondsLeft} seconds left`}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.brandAccent}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - progress)}
          rotation={-90}
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <Text style={styles.ringSeconds} testID="matchmaking-seconds">
        {secondsLeft}
      </Text>
    </View>
  );
}

/** Matchmaking view while searching for a rival (Figma 157:3800). */
export function MatchmakingView({ state, youAvatar, onCancel, search }: Props) {
  const secondsLeft = useSecondsLeft(search?.phase === 'searching' ? search.deadline : null);
  const categoriesText = state.categories
    .map((c) => getStoryCategoryMeta(c).name)
    .join(', ');

  if (search?.phase === 'matched' && search.rival) {
    return (
      <DuelPage testID="duel-matchmaking" centered>
        <View style={styles.card} testID="matchmaking-matched">
          <View style={styles.avatarRow}>
            <PlayerAvatar avatar={youAvatar} size={64} ring="accent" />
            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <PlayerAvatar avatar={search.rival.avatar} size={64} ring="xp" />
          </View>
          <Text style={styles.title} testID="matchmaking-title">
            Rival found!
          </Text>
          <Text style={styles.rivalName} testID="matchmaking-rival-name">
            {formatPlayerName(search.rival.name)}
          </Text>
          <LiveBadge testID="matchmaking-live-badge" />
          <Text style={styles.categories} numberOfLines={2}>
            Categories: {categoriesText}
          </Text>
        </View>
      </DuelPage>
    );
  }

  return (
    <DuelPage
      testID="duel-matchmaking"
      centered
      footer={
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          testID="matchmaking-cancel"
        />
      }
    >
      <View style={styles.card} testID="matchmaking-card">
        <View style={styles.avatarRow}>
          <PlayerAvatar avatar={youAvatar} size={64} ring="accent" />
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          {search?.phase === 'searching' && search.deadline !== null ? (
            <SearchRing secondsLeft={secondsLeft} />
          ) : (
            <View style={styles.rivalSearchCircle}>
              <ActivityIndicator size="small" color={colors.brandAccent} />
            </View>
          )}
        </View>

        <Text style={styles.title} testID="matchmaking-title">
          Searching for rival…
        </Text>

        <Text style={styles.categories} numberOfLines={2}>
          Categories: {categoriesText}
        </Text>

        <View style={styles.tipRow}>
          <Feather name="info" size={14} color={colors.onBrandMuted} />
          <Text style={styles.tipText}>
            6 questions · no time pressure, accuracy counts
          </Text>
        </View>
      </View>
    </DuelPage>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  vsBadge: {
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  vsText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
  rivalSearchCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.brandAccent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSeconds: {
    ...type.labelStrong,
    color: colors.textOnBrand,
  },
  rivalName: {
    ...type.labelStrong,
    color: colors.textOnBrand,
  },
  title: {
    ...type.titleSection,
    color: colors.textOnBrand,
  },
  categories: {
    ...type.bodyDefault,
    color: colors.onBrandMuted,
    textAlign: 'center',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandPrimarySoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  tipText: {
    ...type.labelTab,
    color: colors.onBrandMuted,
  },
});
