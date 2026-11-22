import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { StoryLandmark } from '@/components/StoryLandmark';
import { CANVAS } from '@/components/video/kit/canvas';
import { useLoop } from '@/components/video/kit/useLoop';
import { radii, scenePalette } from '@/constants/theme';
import type { ScenePlace, SceneTime } from '@/types/lessons';
import type { LandmarkKind } from '@/types/stories';

type Props = {
  place: ScenePlace;
  time: SceneTime;
  /** `back`: sky, skyline, landmark, wall. `front`: the desk or table line, drawn over seated characters. */
  part: 'back' | 'front';
  color: string;
  landmark: { kind: LandmarkKind; at: number } | null;
  /** Gives each city its own, stable skyline. */
  seed: string;
  ambient: boolean;
};

type Building = { x: number; width: number; height: number; windows: { x: number; y: number; group: number }[] };

function skyline(seed: string, width: number, base: number, maxHeight: number): Building[] {
  let s = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return (s % 1000) / 1000;
  };
  const out: Building[] = [];
  for (let x = -4; x < width; ) {
    const w = 18 + Math.round(rand() * 22);
    const h = Math.round(maxHeight * (0.35 + rand() * 0.65));
    const windows: Building['windows'] = [];
    for (let wy = base - h + 6; wy < base - 6; wy += 9) {
      for (let wx = x + 4; wx < x + w - 5; wx += 7) {
        if (rand() < 0.3) windows.push({ x: wx, y: wy, group: Math.floor(rand() * 3) });
      }
    }
    out.push({ x, width: w, height: h, windows });
    x += w + 2;
  }
  return out;
}

const STARS = [
  [30, 18], [72, 40], [118, 14], [160, 34], [214, 20], [252, 48], [296, 16], [338, 38], [366, 12], [190, 58],
] as const;

/**
 * Where a scene happens: sky by time of day, the city skyline with the story's landmark (through a window
 * indoors, full width on the street), wall, floor and desk. Windows twinkle and stars shine at night (loops).
 */
export const Setting = memo(function Setting({ place, time, part, color, landmark, seed, ambient }: Props) {
  const indoor = place !== 'street';
  const area = indoor ? CANVAS.window : { x: 0, y: 0, width: CANVAS.width, height: CANVAS.floor };
  const base = area.y + area.height;
  const buildings = useMemo(() => skyline(seed, CANVAS.width, base, area.height * 0.55), [seed, base, area.height]);

  // Only the back part draws the lit windows and the stars, so the front part leaves their loops off.
  const loops = ambient && part === 'back';
  const twinkle = [useLoop(loops, 3200), useLoop(loops, 4100, 600), useLoop(loops, 2700, 1200)];
  const stars = useLoop(loops && time === 'night', 3000);
  const g0 = useAnimatedStyle(() => ({ opacity: interpolate(twinkle[0].get(), [0, 1], [1, 0.35]) }));
  const g1 = useAnimatedStyle(() => ({ opacity: interpolate(twinkle[1].get(), [0, 1], [0.4, 1]) }));
  const g2 = useAnimatedStyle(() => ({ opacity: interpolate(twinkle[2].get(), [0, 1], [0.9, 0.5]) }));
  const starStyle = useAnimatedStyle(() => ({ opacity: interpolate(stars.get(), [0, 1], [0.45, 1]) }));
  const groups = [g0, g1, g2];

  if (part === 'front') {
    if (!indoor) return null;
    // Desk (office), table (cafe) or sofa back (home): one line the seated characters sit behind.
    const top = place === 'home' ? CANVAS.desk + 8 : CANVAS.desk;
    const cafe = place === 'cafe';
    return (
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}>
        <Rect x={cafe ? 120 : 0} y={top} width={cafe ? 240 : CANVAS.width} height={10} rx={radii.bar} fill={scenePalette.desk} />
        {place !== 'home' && <Rect x={cafe ? 230 : 300} y={top + 10} width={6} height={CANVAS.floor - top - 10} fill={scenePalette.desk} />}
      </Svg>
    );
  }

  const sky = scenePalette.sky[time];
  const lit = time !== 'day';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky[0]} />
            <Stop offset="0.6" stopColor={sky[1]} />
            <Stop offset="1" stopColor={sky[2]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={CANVAS.width} height={CANVAS.height} fill="url(#sky)" />
        {buildings.map((b) => (
          <Rect key={b.x} x={b.x} y={base - b.height} width={b.width} height={b.height} fill={scenePalette.skyline} />
        ))}
      </Svg>

      {time === 'night' && (
        <Animated.View style={[StyleSheet.absoluteFill, starStyle]}>
          <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}>
            {STARS.map(([x, y]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={scenePalette.star} />
            ))}
          </Svg>
        </Animated.View>
      )}

      {/* Lit windows in three groups that fade on their own loops: three nodes, not one per window. */}
      {lit &&
        groups.map((style, g) => (
          <Animated.View key={g} style={[StyleSheet.absoluteFill, style]}>
            <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}>
              {buildings.flatMap((b) =>
                b.windows.filter((w) => w.group === g).map((w) => <Rect key={`${w.x}-${w.y}`} x={w.x} y={w.y} width={3} height={4} fill={scenePalette.windowLit} />),
              )}
            </Svg>
          </Animated.View>
        ))}

      {landmark && (
        <View style={[styles.landmark, { left: area.x, top: area.y, width: area.width, height: area.height }]}>
          <View style={[styles.landmarkScale, indoor && styles.landmarkIndoor]}>
            <StoryLandmark kind={landmark.kind} at={landmark.at} color={color} />
          </View>
        </View>
      )}

      {indoor && (
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}>
          {/* Wall with the window cut out (even-odd), window bars, floor. */}
          <Path
            fillRule="evenodd"
            fill={scenePalette.wall[time]}
            d={`M0 0H${CANVAS.width}V${CANVAS.height}H0Z M${area.x} ${area.y}H${area.x + area.width}V${base}H${area.x}Z`}
          />
          <Rect x={area.x + area.width / 2 - 2} y={area.y} width={4} height={area.height} fill={scenePalette.wall[time]} />
          <Rect x={area.x} y={base - 4} width={area.width} height={6} fill={scenePalette.wall[time]} />
          <Rect x={0} y={CANVAS.floor} width={CANVAS.width} height={CANVAS.height - CANVAS.floor} fill={scenePalette.floor[time]} />
        </Svg>
      )}
      {!indoor && (
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}>
          <Rect x={0} y={CANVAS.floor} width={CANVAS.width} height={CANVAS.height - CANVAS.floor} fill={scenePalette.floor[time]} />
        </Svg>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  landmark: { position: 'absolute', overflow: 'hidden' },
  // The story-hero landmark is drawn for a taller hero; a little smaller and dimmed it sits in the skyline.
  landmarkScale: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.85, transformOrigin: 'bottom', transform: [{ scale: 0.9 }] },
  landmarkIndoor: { transform: [{ scale: 0.75 }] },
});
