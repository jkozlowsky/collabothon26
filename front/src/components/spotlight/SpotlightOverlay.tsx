import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { Spot, SpotRect } from '@/types/spotlight';

type Props = { spot: Spot; rect: SpotRect; onClose: () => void };

const PAD = 6;
const GAP = 12;
const RADIUS = radii.card + PAD;

/** The whole frame minus a rounded hole; drawn with even-odd fill so the hole stays clear. */
function scrimPath(w: number, h: number, hole: { left: number; top: number; width: number; height: number }) {
  const { left: x, top: y, width: hw, height: hh } = hole;
  const r = Math.min(RADIUS, hw / 2, hh / 2);
  return (
    `M0 0H${w}V${h}H0Z` +
    `M${x + r} ${y}H${x + hw - r}A${r} ${r} 0 0 1 ${x + hw} ${y + r}V${y + hh - r}A${r} ${r} 0 0 1 ${x + hw - r} ${y + hh}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + hh - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

/** Dims everything but one feature: four scrim panels around a hole, a yellow ring, and a note with a close button. */
export function SpotlightOverlay({ spot, rect, onClose }: Props) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  // The overlay may not start at the window's corner (web centres the phone), so the hole is moved by its origin.
  const [frame, setFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    // Full screen on a phone: draw at once, then correct by the real origin.
    setFrame({ x: 0, y: 0, width, height });
    ref.current?.measureInWindow((x, y) => setFrame({ x, y, width, height }));
  };

  const hole = frame && {
    left: Math.max(0, rect.x - frame.x - PAD),
    top: Math.max(0, rect.y - frame.y - PAD),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const below = hole && frame ? hole.top + hole.height / 2 < frame.height / 2 : true;

  return (
    <View ref={ref} style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout} testID="spotlight">
      {hole && frame && (
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={frame.width} height={frame.height}>
            <Path d={scrimPath(frame.width, frame.height, hole)} fill={colors.spotlightScrim} fillRule="evenodd" />
          </Svg>
          {/* Four clear panels around the hole catch taps on the dim area and close; the hole lets touches through. */}
          <Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.scrim, { top: 0, left: 0, right: 0, height: hole.top }]} />
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
            style={[styles.scrim, { top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }]}
          />
          <Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.scrim, { top: hole.top, left: 0, width: hole.left, height: hole.height }]} />
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
            style={[styles.scrim, { top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }]}
          />
          <View pointerEvents="none" style={[styles.ring, hole]} />

          <View
            style={[styles.note, below ? { top: hole.top + hole.height + GAP } : { bottom: frame.height - hole.top + GAP }]}
            accessibilityViewIsModal
            accessibilityLiveRegion="polite"
            testID="spotlight-note"
          >
            <View style={styles.noteHead}>
              <Text style={styles.overline}>Atlas · Here it is</Text>
              <Tappable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} testID="spotlight-close">
                <Icon name="close" size={20} color={colors.brandPrimary} />
              </Tappable>
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {spot.title}
            </Text>
            <Text style={styles.hint}>{spot.hint}</Text>
            <Button label="Got it" variant="dark" onPress={onClose} testID="spotlight-ok" />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute' },
  ring: { position: 'absolute', borderRadius: RADIUS, borderWidth: 2, borderColor: colors.brandAccent },
  note: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    padding: spacing.lg,
    ...elevation.high,
  },
  noteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overline: { ...type.overline, color: colors.brandPrimary },
  title: type.titleSection,
  hint: { ...type.bodyDefault, color: colors.textMuted },
});
