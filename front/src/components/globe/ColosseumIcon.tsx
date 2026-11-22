import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = {
  size?: number;
  color?: string;
};

export function ColosseumIcon({ size = 20, color = colors.textOnBrand }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer amphitheatre wall */}
      <Path
        d="M3 19V9.5C3 6.8 6.5 5 12 5C17.5 5 21 6.8 21 9.5V19"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tier divider line */}
      <Path
        d="M3 13.5H21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Bottom base line */}
      <Path
        d="M2 19H22"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Ground floor arches */}
      <Path
        d="M5.5 19V16.5C5.5 15.7 6.2 15 7 15C7.8 15 8.5 15.7 8.5 16.5V19"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M10.5 19V16.5C10.5 15.7 11.2 15 12 15C12.8 15 13.5 15.7 13.5 16.5V19"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M15.5 19V16.5C15.5 15.7 16.2 15 17 15C17.8 15 18.5 15.7 18.5 16.5V19"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Upper floor arches / openings */}
      <Path
        d="M6.5 13.5V11C6.5 10.4 7 10 7.5 10C8 10 8.5 10.4 8.5 11V13.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M11 13.5V11C11 10.4 11.5 10 12 10C12.5 10 13 10.4 13 11V13.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M15.5 13.5V11C15.5 10.4 16 10 16.5 10C17 10 17.5 10.4 17.5 11V13.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
