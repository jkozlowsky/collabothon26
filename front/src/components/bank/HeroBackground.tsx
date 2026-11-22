import { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

/** Petrol gradient with two faint circles, like the cards in Figma. The parent clips it to its radius. */
export function HeroBackground() {
  // Unique per instance: on web a duplicated gradient id can resolve to a copy inside a hidden tab and paint nothing.
  const id = `hero-${useId().replace(/:/g, '')}`;
  // Android's SVG does not stretch "100%" to an absolutely positioned box, so measure it and pass numbers.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
  };
  const { width, height } = size;
  return (
    // Solid petrol underneath, so the card is never white before the first layout.
    <View style={[StyleSheet.absoluteFill, styles.fill]} onLayout={onLayout} pointerEvents="none">
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.heroGradientFrom} />
              <Stop offset="1" stopColor={colors.brandPrimary} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
          <Circle cx={width * 0.88} cy={height * 0.12} r={90} fill={colors.textOnBrand} opacity={0.05} />
          <Circle cx={width * 0.96} cy={height * 1.05} r={64} fill={colors.textOnBrand} opacity={0.05} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: colors.brandPrimary },
});
