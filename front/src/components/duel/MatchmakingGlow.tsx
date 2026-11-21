import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

/** Soft ocean glow behind the avatars on the petrol matchmaking screen. */
export function MatchmakingGlow() {
  const id = `glow-${useId().replace(/:/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="32%" r="55%">
            <Stop offset="0" stopColor={colors.globeOceanLight} stopOpacity={0.34} />
            <Stop offset="1" stopColor={colors.brandPrimary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
