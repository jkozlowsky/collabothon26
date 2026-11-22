import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { OFF_SCREEN, type Projection } from '@/components/globe/globeConfig';
import { PIN_BOX } from '@/components/globe/GlobePin';
import { fadeOpacity, project, type Vec3 } from '@/lib/geo';

type Props = Projection & {
  /** The pin's city on the sphere. */
  v: Vec3;
  /** Px the canvas reaches below and above the globe area. */
  below: number;
  above: number;
  children: ReactNode;
};

/** Holds a pin with its tip on the city; hidden (and moved off-screen, so untappable) behind the sphere. */
export function PinSlot({ v, yaw, pitch, cx, cy, radius, zoom, below, above, children }: Props) {
  const style = useAnimatedStyle(() => {
    const p = project(v, { yaw: yaw.value, pitch: pitch.value }, cx, cy, radius * zoom.value);
    // Zoomed in, pins past the canvas would float over a cut-off sphere.
    const inside = p.x >= 0 && p.x <= cx * 2 && p.y >= -above && p.y <= cy * 2 + below;
    const opacity = inside ? fadeOpacity(p.z) : 0;
    return {
      opacity,
      // Nearer pins draw over farther ones.
      zIndex: Math.round(p.z * 100) + 100,
      transform: [{ translateX: opacity > 0 ? p.x - PIN_BOX.width / 2 : OFF_SCREEN }, { translateY: p.y - PIN_BOX.height }],
    };
  });
  return <Animated.View style={[styles.slot, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, top: 0 },
});
