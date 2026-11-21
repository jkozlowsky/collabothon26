import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { Amount } from '@/components/video/kit/Amount';
import { CANVAS } from '@/components/video/kit/canvas';
import { Character } from '@/components/video/kit/Character';
import { Chart } from '@/components/video/kit/Chart';
import { Phone } from '@/components/video/kit/Phone';
import { Setting } from '@/components/video/kit/Setting';
import { Tag } from '@/components/video/kit/Tag';
import { scenePalette } from '@/constants/theme';
import { amountUntil, layerProgress, type ResolvedScene } from '@/lib/sceneClock';
import type { LandmarkKind } from '@/types/stories';

type Props = {
  scene: ResolvedScene;
  /** Scene clock in seconds; kit elements derive their style from it on the UI thread. */
  t: SharedValue<number>;
  /** Seconds: the audio's length, or `duration` while the scene has none. */
  length: number;
  /** Player size; the 390 × 312 canvas is scaled to fill it. */
  width: number;
  height: number;
  color: string;
  landmark: { kind: LandmarkKind; at: number } | null;
  seed: string;
  /** First frame only: no loops (dev gallery, thumbnails). */
  still?: boolean;
  reducedMotion: boolean;
};

const easeInOut = Easing.inOut(Easing.quad);

/** Draws one scene at clock `t` from its JSON: setting, characters, then the timed kit elements on top. */
export const Scene = memo(function Scene({ scene, t, length, width, height, color, landmark, seed, still = false, reducedMotion }: Props) {
  const ambient = !still && !reducedMotion;
  const scale = Math.max(width / CANVAS.width, height / CANVAS.height);
  const camera = reducedMotion ? 'none' : scene.camera;

  const cameraStyle = useAnimatedStyle(() => {
    const p = easeInOut(layerProgress(t.get(), 0, length));
    switch (camera) {
      case 'push':
        return { transform: [{ translateX: -8 * p }, { translateY: 4 * p }, { scale: 1 + 0.1 * p }] };
      case 'pull':
        return { transform: [{ translateX: -8 * (1 - p) }, { translateY: 4 * (1 - p) }, { scale: 1.12 - 0.1 * p }] };
      case 'drift':
        return { transform: [{ translateX: -8 + 16 * p }, { rotate: `${-0.6 + 1.2 * p}deg` }, { scale: 1.05 }] };
      default:
        return { transform: [{ scale: 1 }] };
    }
  });

  const { place, time } = scene.setting;
  const phoneRight = scene.layers.some((l) => l.kind === 'phone' && (l.x ?? 0.72) > 0.5);
  return (
    <View style={[styles.frame, { width, height }]} pointerEvents="none">
      <View
        style={[
          styles.canvas,
          { left: (width - CANVAS.width) / 2, top: (height - CANVAS.height) / 2, transform: [{ scale }] },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, cameraStyle]}>
          <Setting place={place} time={time} part="back" color={color} landmark={landmark} seed={seed} ambient={ambient} />
          {scene.layers.map((layer, i) =>
            layer.kind === 'character' ? <Character key={i} pose={layer.pose} x={layer.x} color={color} ambient={ambient} /> : null,
          )}
          <Setting place={place} time={time} part="front" color={color} landmark={landmark} seed={seed} ambient={ambient} />
          {scene.layers.map((layer, i) => {
            switch (layer.kind) {
              case 'chart':
                return <Chart key={i} {...layer} t={t} />;
              case 'phone':
                return <Phone key={i} messages={layer.messages} x={layer.x} t={t} reducedMotion={reducedMotion} />;
              case 'amount':
                return (
                  <Amount key={i} {...layer} until={amountUntil(scene.layers, i, length)} length={length} align={phoneRight ? 'left' : 'center'} t={t} />
                );
              case 'tag':
                return <Tag key={i} {...layer} t={t} reducedMotion={reducedMotion} />;
              default:
                return null;
            }
          })}
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: scenePalette.surface },
  canvas: { position: 'absolute', width: CANVAS.width, height: CANVAS.height },
});
