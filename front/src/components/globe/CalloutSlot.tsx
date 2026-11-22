import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { OFF_SCREEN, type Projection } from '@/components/globe/globeConfig';
import { PIN_BOX } from '@/components/globe/GlobePin';
import { CALLOUT_WIDTH } from '@/components/globe/PinCallout';
import { FADE_BAND, project, type Vec3 } from '@/lib/geo';

type Props = Projection & {
  /** The selected pin's city on the sphere. */
  v: Vec3;
  areaWidth: number;
  areaHeight: number;
  children: ReactNode;
};

/** The callout keeps this far from the edges of the globe area. */
const EDGE = 8;
/** From the pin's tip sideways to the callout: clears the head of the active pin (a 44 px square turned 45°). */
const PIN_GAP = 30;
/** The callout's height until onLayout measures it. */
const HEIGHT_ESTIMATE = 110;

/** Beside the selected pin, flipped to its left near the right edge, kept inside the globe area. */
export function CalloutSlot({ v, yaw, pitch, cx, cy, radius, zoom, areaWidth, areaHeight, children }: Props) {
  const height = useSharedValue(HEIGHT_ESTIMATE);
  const style = useAnimatedStyle(() => {
    const p = project(v, { yaw: yaw.value, pitch: pitch.value }, cx, cy, radius * zoom.value);
    // Only beside a fully visible pin: a half-faded callout at the horizon would cover other pins.
    const shown = p.z >= FADE_BAND;
    const right = p.x + PIN_GAP;
    const x = right + CALLOUT_WIDTH > areaWidth - EDGE ? p.x - PIN_GAP - CALLOUT_WIDTH : right;
    const y = Math.min(areaHeight - height.value - EDGE, Math.max(EDGE, p.y - PIN_BOX.height));
    return { transform: [{ translateX: shown ? Math.max(EDGE, x) : OFF_SCREEN }, { translateY: y }] };
  });
  return (
    <Animated.View style={[styles.slot, style]} onLayout={(e) => height.set(e.nativeEvent.layout.height)}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, top: 0, zIndex: 300 },
});
