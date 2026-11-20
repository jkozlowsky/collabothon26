import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

/**
 * Kit's top background gradient (bgTint -> bgCanvas) for light Duel screens.
 * Rendered with react-native-svg so it works on iOS, Android and web with no extra dependency.
 */
export function LightTopGradient({ height = 240 }: { height?: number }) {
  return (
    <View style={[styles.topWash, { height }]} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="duelTopWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bgTint} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.bgCanvas} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#duelTopWash)" />
      </Svg>
    </View>
  );
}

/** Subtle radial ocean glow behind the dark teal matchmaking screen. */
export function DarkMatchmakingGlow() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="duelMmGlow" cx="50%" cy="32%" r="55%">
            <Stop offset="0" stopColor={colors.globeOceanLight} stopOpacity={0.34} />
            <Stop offset="1" stopColor={colors.brandPrimary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#duelMmGlow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
