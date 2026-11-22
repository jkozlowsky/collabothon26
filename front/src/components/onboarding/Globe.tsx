import { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

/** All globe geometry lives in a 300×300 box; it is scaled to `size`. */
export const GLOBE_VIEW = 300;
const C = 150;
const R = 140;

const LAND = [
  // Greenland
  'M70 66 L98 58 L110 72 L100 92 L80 96 L66 84 Z',
  // Europe
  'M118 96 L140 82 L166 86 L184 76 L206 88 L200 106 L184 112 L172 124 L150 122 L132 116 Z',
  // Africa
  'M122 140 L154 130 L184 136 L200 152 L196 176 L184 198 L174 226 L160 244 L150 234 L146 210 L132 194 L116 180 L114 158 Z',
  // Arabia and India
  'M210 120 L244 110 L272 122 L278 146 L262 168 L242 174 L228 158 L214 144 Z',
  // Madagascar
  'M206 210 L214 202 L220 220 L212 234 Z',
  // South America
  'M26 176 L56 166 L74 182 L70 210 L56 244 L40 252 L30 226 Z',
];

/** Latitude lines, each as wide as the sphere is at that height. */
const PARALLELS = [-0.7, -0.35, 0, 0.35, 0.7].map((f) => {
  const y = C + f * R;
  const half = Math.sqrt(R * R - (f * R) ** 2);
  return { y, x1: C - half, x2: C + half };
});
const MERIDIANS = [0.33, 0.66, 0.92];
const GRID_LINE = { stroke: colors.textOnBrand, strokeOpacity: 0.12, strokeWidth: 1.2 };

/** The globe sphere: ocean, grid and land, without pins. */
export function GlobeSphere({ size }: { size: number }) {
  // Unique ids: the bank shows several globes at once, and on web a shared id can point at a hidden copy.
  const uid = useId().replace(/:/g, '');
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GLOBE_VIEW} ${GLOBE_VIEW}`}>
      <Defs>
        <RadialGradient id={`ocean-${uid}`} cx="38%" cy="32%" r="75%">
          <Stop offset="0" stopColor={colors.sphereOceanLight} />
          <Stop offset="0.45" stopColor={colors.sphereOceanMid} />
          <Stop offset="1" stopColor={colors.brandPrimary} />
        </RadialGradient>
        <ClipPath id={`sphere-${uid}`}>
          <Circle cx={C} cy={C} r={R} />
        </ClipPath>
      </Defs>
      <Circle cx={C} cy={C} r={R} fill={`url(#ocean-${uid})`} />
      <G clipPath={`url(#sphere-${uid})`}>
        {PARALLELS.map((p) => (
          <Line key={p.y} x1={p.x1} y1={p.y} x2={p.x2} y2={p.y} {...GRID_LINE} />
        ))}
        {MERIDIANS.map((f) => (
          <Ellipse key={f} cx={C} cy={C} rx={R * f} ry={R} fill="none" {...GRID_LINE} />
        ))}
        <Line x1={C} y1={C - R} x2={C} y2={C + R} {...GRID_LINE} />
        {LAND.map((d) => (
          <Path key={d} d={d} fill={colors.sphereLand} fillOpacity={0.88} stroke={colors.textOnBrand} strokeOpacity={0.3} strokeLinejoin="round" />
        ))}
      </G>
    </Svg>
  );
}
