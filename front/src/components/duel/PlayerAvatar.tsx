import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Avatar } from '@/components/profile/Avatar';
import { colors, tints } from '@/constants/theme';
import type { AvatarId } from '@/types/account';

type Props = {
  /** Account avatar; null (or `isBot`) draws the bot tile. */
  avatar: AvatarId | null | undefined;
  isBot?: boolean;
  size: number;
  /** Ring around the avatar: yellow for you / first place, gold for rivals, grey for the rest. */
  ring?: 'none' | 'accent' | 'xp' | 'muted';
  /** Half-transparent while the player is disconnected. */
  dimmed?: boolean;
};

const RING = { accent: colors.brandAccent, xp: colors.feedbackXp, muted: colors.borderStrong } as const;
const RING_WIDTH = 3;

/** A duel player: the account avatar from the profile, or the bot tile for bots. */
export function PlayerAvatar({ avatar, isBot = false, size, ring = 'none', dimmed = false }: Props) {
  const inner = ring === 'none' ? size : size - RING_WIDTH * 2;
  const bot = isBot || !avatar;
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        ring !== 'none' && { borderWidth: RING_WIDTH, borderColor: RING[ring] },
        dimmed && styles.dimmed,
      ]}
      testID={bot ? 'player-avatar-bot' : `player-avatar-${avatar}`}
    >
      {bot ? (
        <View style={[styles.bot, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <Icon name="bot" size={Math.round(inner * 0.5)} color={colors.storyViolet} />
        </View>
      ) : (
        <Avatar id={avatar} size={inner} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.45 },
  bot: { backgroundColor: tints.violet, alignItems: 'center', justifyContent: 'center' },
});
