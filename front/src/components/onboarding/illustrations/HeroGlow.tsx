import { useId } from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

/** Soft ocean light behind an illustration; fills the box it is placed in. */
export function HeroGlow() {
  const id = `atlas-glow-${useId().replace(/:/g, '')}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.globeOceanLight} stopOpacity={0.9} />
          <Stop offset="0.55" stopColor={colors.globeOceanLight} stopOpacity={0.25} />
          <Stop offset="1" stopColor={colors.brandPrimary} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  );
}
