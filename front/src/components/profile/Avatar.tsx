import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { AVATAR_SVG } from '@/components/profile/avatarSvg';
import { colors, tints } from '@/constants/theme';
import type { AvatarId } from '@/types/account';

/** Circle colour per avatar, from the theme, so the set reads as one family. */
const BACKGROUND: Record<AvatarId, string> = {
  m1: colors.brandPrimarySoft,
  m2: tints.rose,
  m3: tints.teal,
  f1: colors.brandAccentSoft,
  f2: tints.violet,
  f3: tints.orange,
};

type Props = { id: AvatarId; size: number };

export const AVATAR_IDS = Object.keys(AVATAR_SVG) as AvatarId[];

/** Shown until the account has loaded, or when it cannot be loaded. */
export const DEFAULT_AVATAR: AvatarId = 'm1';

/** An illustrated avatar on a coloured circle. */
export function Avatar({ id, size }: Props) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BACKGROUND[id] }]} />
      {/* Positioned too: on web an absolute sibling paints over a static one and would hide the drawing. */}
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={AVATAR_SVG[id]} width={size} height={size} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A white base under the tints, so the rgba colours look the same on any background.
  circle: { overflow: 'hidden', backgroundColor: colors.bgSurface },
});
