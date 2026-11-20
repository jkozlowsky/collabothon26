import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { colors, radii } from '@/constants/theme';

type Props = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
  testID?: string;
};

const THUMB = 24;

/** Minimal horizontal slider (drag or tap the track). Pure JS so it behaves the same on Android and web. */
export function Slider({ value, min, max, step, onChange, accessibilityLabel, testID }: Props) {
  const [width, setWidth] = useState(0);

  const fromX = (x: number) => {
    const t = Math.min(1, Math.max(0, (x - THUMB / 2) / (width - THUMB || 1)));
    return Math.round((min + t * (max - min)) / step) * step;
  };
  const onTouch = (e: GestureResponderEvent) => onChange(fromX(e.nativeEvent.locationX));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const t = (value - min) / (max - min);
  const left = t * Math.max(0, width - THUMB);

  return (
    <View
      style={styles.hit}
      onLayout={onLayout}
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))
      }
      // Plain responder props (no PanResponder object), so the handlers always see the latest width.
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onTouch}
      onResponderMove={onTouch}
    >
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: left + THUMB / 2 }]} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 36, justifyContent: 'center' },
  track: { height: 6, borderRadius: radii.bar, backgroundColor: colors.borderDefault, marginHorizontal: THUMB / 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brandPrimary, marginLeft: -THUMB / 2 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.brandAccent,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
  },
});
