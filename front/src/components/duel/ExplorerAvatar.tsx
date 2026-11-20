import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Icon } from '@/components/bank/Icon';
import { colors, fonts } from '@/constants/theme';
import type { AvatarRank } from '@/types/duel';

type AvatarProps = {
  rank?: AvatarRank;
  size?: number;
  /** Highlight ring colour; defaults to rank-based ring matching Figma. */
  ringColor?: string;
  dimmed?: boolean;
};

const RING_BY_RANK: Record<AvatarRank, string> = {
  1: colors.borderStrong,
  2: colors.storyTeal,
  3: colors.feedbackXp,
  4: colors.brandAccent,
};

/**
 * Illustrated Explorer Avatar matching the Finance Quest Design Kit ranks:
 * 1 Saver, 2 Explorer (teal vest + map), 3 Navigator (+ hat), 4 Investor (+ hat & gold badge).
 */
export function ExplorerAvatar({ rank = 2, size = 48, ringColor, dimmed = false }: AvatarProps) {
  const stroke = ringColor ?? RING_BY_RANK[rank];
  const hasHat = rank >= 3;
  const hasCompass = rank >= 3;
  const hasMap = rank >= 2;
  const clipId = `avatar-clip-${rank}-${size}`;

  return (
    <View style={dimmed ? styles.dimmed : undefined}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx="32" cy="32" r="28" />
          </ClipPath>
        </Defs>
        {/* Soft circular backdrop */}
        <Circle cx="32" cy="32" r="29" fill="#EDF3F4" />

        <G clipPath={`url(#${clipId})`}>
          {/* Shoulders / teal shirt */}
          <Path d="M12 62 C13 48, 22 44, 32 44 C42 44, 51 48, 52 62 Z" fill="#1C97A4" />
          {/* Orange explorer backpack straps */}
          <Path d="M21 46 L24 62 L28 62 L25 45 Z" fill="#E8833A" />
          <Path d="M43 46 L40 62 L36 62 L39 45 Z" fill="#E8833A" />
          {/* Shirt collar */}
          <Path d="M27 44 L32 51 L37 44 Z" fill="#FFFFFF" />

          {/* Small folded map on lower left for ranks 2+ */}
          {hasMap && (
            <G>
              <Rect x="11" y="49" width="12" height="11" rx="2" fill="#FFF4CC" stroke="#E0B642" strokeWidth="1" />
              <Path d="M14 53 L19 52 M14 56 L20 56" stroke="#1E8A5E" strokeWidth="1.2" strokeLinecap="round" />
            </G>
          )}

          {/* Neck */}
          <Rect x="28" y="38" width="8" height="8" rx="3" fill="#F2C6A0" />

          {/* Ears */}
          <Circle cx="21" cy="29" r="3" fill="#F2C6A0" />
          <Circle cx="43" cy="29" r="3" fill="#F2C6A0" />

          {/* Head */}
          <Circle cx="32" cy="28" r="11" fill="#F7D3B5" />

          {/* Hair */}
          <Path d="M21 26 C21 18, 27 15, 32 15 C37 15, 43 18, 43 26 C40 21, 36 20, 32 20 C28 20, 24 21, 21 26 Z" fill="#5A3A29" />

          {/* Eyes & smile */}
          <Circle cx="28" cy="28" r="1.5" fill="#1A262B" />
          <Circle cx="36" cy="28" r="1.5" fill="#1A262B" />
          <Path d="M28.5 32.5 Q32 35.5 35.5 32.5" stroke="#5A3A29" strokeWidth="1.6" strokeLinecap="round" fill="none" />

          {/* Explorer hat for ranks 3 & 4 */}
          {hasHat && (
            <G>
              <Ellipse cx="32" cy="20" rx="16" ry="3.6" fill="#C49A6C" />
              <Path d="M23 20 C23 13, 27 10, 32 10 C37 10, 41 13, 41 20 Z" fill="#B08456" />
              <Rect x="23" y="17.5" width="18" height="2.4" rx="1" fill="#002E3C" />
            </G>
          )}

          {/* Compass medallion for ranks 3 & 4 */}
          {hasCompass && (
            <G>
              <Circle cx="32" cy="54" r="5" fill={colors.brandAccent} stroke={colors.brandPrimary} strokeWidth="1.4" />
              <Circle cx="32" cy="54" r="1.5" fill={colors.brandPrimary} />
            </G>
          )}
        </G>

        {/* Outer rank ring */}
        <Circle cx="32" cy="32" r="29" fill="none" stroke={stroke} strokeWidth="3.5" />
      </Svg>
    </View>
  );
}

/** Bot opponent tile matching Screen 8 ("Bella the Bot"). */
export function BotAvatar({ size = 48 }: { size?: number }) {
  return (
    <View
      style={[
        styles.botCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Icon name="bot" size={Math.round(size * 0.5)} color={colors.storyViolet} />
    </View>
  );
}

/** Dashed "?" placeholder used on the dark matchmaking screen. */
export function MysteryAvatar({ size = 88 }: { size?: number }) {
  return (
    <View
      style={[
        styles.mystery,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.mysteryMark}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dimmed: { opacity: 0.45 },
  botCircle: {
    backgroundColor: '#EEEBFF',
    borderWidth: 2,
    borderColor: colors.storyViolet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mystery: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mysteryMark: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: 'rgba(255, 255, 255, 0.72)',
  },
});
