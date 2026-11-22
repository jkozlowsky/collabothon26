import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = {
  /** Size of the globe area; the sphere sits in its middle. */
  width: number;
  height: number;
  radius: number;
  zoom: SharedValue<number>;
};

/** The layer reaches this far above and below the area, so a glow wider than the area is not cut off. */
const HALO_PAD = 40;

/** A glow and a dashed ring around the sphere, so it reads as lit rather than cut out of the page. */
export function GlobeHalo({ width, height, radius, zoom }: Props) {
  // Both sit just outside the sphere: they fade out as soon as the globe is zoomed in.
  const fade = useAnimatedStyle(() => ({ opacity: interpolate(zoom.value, [1, 1.15], [1, 0], 'clamp') }));
  const cx = width / 2;
  const cy = height / 2 + HALO_PAD;
  // The glow fades out just inside the screen's sides; top and bottom have HALO_PAD to spare.
  const glow = Math.min(radius * 1.2, cx - 2, cy - 2);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents="none">
      {/* Explicit size: on web an absolutely filled Svg falls back to 300 × 150. */}
      <Svg width={width} height={height + HALO_PAD * 2} style={styles.svg} pointerEvents="none">
        <Defs>
          <RadialGradient id="globe-glow" cx={cx} cy={cy} r={glow} gradientUnits="userSpaceOnUse">
            <Stop offset={radius / glow} stopColor={colors.globeOceanLight} stopOpacity={0.28} />
            <Stop offset="1" stopColor={colors.globeOceanLight} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={glow} fill="url(#globe-glow)" />
        <Circle cx={cx} cy={cy} r={radius + 16} fill="none" stroke={colors.borderStrong} strokeWidth={1} strokeDasharray="3 6" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute', left: 0, top: -HALO_PAD },
});
