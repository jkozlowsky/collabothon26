import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HeroSurface } from '@/components/bank/HeroCard';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, spacing, type } from '@/constants/theme';
import type { AvatarId } from '@/types/account';

type Side = { avatar: AvatarId | null | undefined; isBot?: boolean; label: string; dimmed?: boolean };

type Props = {
  you: Side;
  rival: Side;
  /** Score and captions between the players. */
  children: ReactNode;
  testID?: string;
};

/** Petrol hero with both players and the score in the middle (waiting and result screens). */
export function VersusHero({ you, rival, children, testID }: Props) {
  return (
    <HeroSurface style={styles.card} testID={testID}>
      <PlayerSide side={you} ring="accent" />
      <View style={styles.middle}>{children}</View>
      <PlayerSide side={rival} ring="xp" />
    </HeroSurface>
  );
}

function PlayerSide({ side, ring }: { side: Side; ring: 'accent' | 'xp' }) {
  return (
    <View style={styles.side}>
      <PlayerAvatar avatar={side.avatar} isBot={side.isBot} size={64} ring={ring} dimmed={side.dimmed} />
      <Text style={styles.label} numberOfLines={2}>
        {side.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xl },
  side: { alignItems: 'center', gap: spacing.sm, width: 96 },
  label: { ...type.labelStrong, color: colors.onBrandStrong, textAlign: 'center' },
  middle: { flex: 1, alignItems: 'center', gap: spacing.xs },
});
