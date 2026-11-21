import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

/** The tinted wash at the top of the light duel screens (bgTint fading into the canvas). */
export function TopWash({ height = 240 }: { height?: number }) {
  // Unique per instance: on web a duplicated gradient id can resolve to a hidden copy and paint nothing.
  const id = `wash-${useId().replace(/:/g, '')}`;
  return (
    <View style={[styles.wash, { height }]} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bgTint} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.bgCanvas} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { position: 'absolute', top: 0, left: 0, right: 0 },
});
