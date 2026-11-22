import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

/** Soft petrol wash behind the header and the globe, fading into the canvas, so the globe does not sit on bare white. */
export function GlobeBackdrop() {
  return (
    // The View sizes it: on web an absolutely filled Svg falls back to 300 × 150.
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="globe-backdrop" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brandPrimarySoft} />
            <Stop offset="0.45" stopColor={colors.brandPrimarySoft} />
            <Stop offset="0.8" stopColor={colors.bgCanvas} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#globe-backdrop)" />
      </Svg>
    </View>
  );
}
