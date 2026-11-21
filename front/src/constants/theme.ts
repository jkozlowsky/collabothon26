/**
 * Design tokens mirrored from the Figma Design Kit (file "Finance Quest — Globe Learn Screen", node 3:55).
 * Names follow the Figma variables: `brandPrimary` ↔ `brand/primary`, `type.titleCard` ↔ `Title/Card`.
 * Figma is the source of truth; change a value there first, then here.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  brandPrimary: '#002E3C',
  brandPrimaryPressed: '#001F29',
  brandPrimarySoft: '#E6EEF0',
  brandAccent: '#FFCC00',
  brandAccentSoft: '#FFF4CC',

  bgCanvas: '#F5F7F7',
  bgSurface: '#FFFFFF',
  bgTint: '#E3EDEF',

  borderDefault: '#E1E6E8',
  borderStrong: '#C9D2D6',

  textPrimary: '#0F1E24',
  textMuted: '#5F6F76',
  textOnBrand: '#FFFFFF',
  textOnAccent: '#002E3C',

  feedbackSuccess: '#1E8A5E',
  feedbackDanger: '#D64545',
  feedbackXp: '#B58B00',
  feedbackStreak: '#E8833A',
  // Not Figma variables: 14% tints of the feedback colours, same recipe as the story icon tiles.
  feedbackSuccessSoft: 'rgba(30, 138, 94, 0.14)',
  feedbackDangerSoft: 'rgba(214, 69, 69, 0.14)',

  globeOceanLight: '#1B6F82',
  globeOceanDeep: '#002E3C',
  globeLand: '#CFE5DD',
  globeLandEdge: '#9CC3B6',

  storyRose: '#D9577A',
  storyViolet: '#6E5AD6',
  storyOrange: '#E8833A',
  storyTeal: '#1E9AA8',
  storySlate: '#9AA5AB',

  // Figma effect style "Glass/Nav": white 62% fill, white 95% 1px border, 24 background blur.
  glassFill: 'rgba(255, 255, 255, 0.62)',
  glassBorder: 'rgba(255, 255, 255, 0.95)',
  // Opaque stand-in where real blur is unavailable (Android), so the nav never looks see-through.
  glassFallback: 'rgba(255, 255, 255, 0.96)',
  // Bank hero cards: petrol gradient and the translucent tiles on top of it.
  heroGradientFrom: '#0B4D5E',
  onBrandTile: 'rgba(255, 255, 255, 0.08)',
  onBrandMuted: 'rgba(255, 255, 255, 0.7)',
  // Duel matchmaking and versus cards: stronger labels, chips and hairlines on petrol.
  onBrandStrong: 'rgba(255, 255, 255, 0.85)',
  onBrandChip: 'rgba(255, 255, 255, 0.14)',
  onBrandHairline: 'rgba(255, 255, 255, 0.16)',
  onBrandDashed: 'rgba(255, 255, 255, 0.35)',
  cardChipGold: '#E9D49A',
  cardChipOnAccent: 'rgba(0, 46, 60, 0.18)',
  scrim: 'rgba(0, 31, 41, 0.4)',
} as const;

/** Story colours at 14% opacity: icon tiles and avatar backgrounds (Figma recipe). */
export const tints = {
  rose: 'rgba(217, 87, 122, 0.14)',
  violet: 'rgba(110, 90, 214, 0.14)',
  teal: 'rgba(30, 154, 168, 0.14)',
  orange: 'rgba(232, 131, 58, 0.14)',
  slate: 'rgba(154, 165, 171, 0.2)',
  xp: 'rgba(181, 139, 0, 0.14)',
  accent: 'rgba(255, 204, 0, 0.16)',
} as const;

/** `story/*` colours by key, as stories name them in their data (`color: 'rose'`). */
export const storyColors = {
  rose: colors.storyRose,
  violet: colors.storyViolet,
  teal: colors.storyTeal,
  orange: colors.storyOrange,
  slate: colors.storySlate,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  bar: 3,
  button: 10,
  tile: 12,
  card: 16,
  sheet: 28,
  orb: 32,
  pill: 999,
} as const;

/** Inter font family names as registered by @expo-google-fonts/inter in the root layout. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

function textStyle(fontFamily: string, fontSize: number, lineHeight: number, letterSpacing = 0): TextStyle {
  return { fontFamily, fontSize, lineHeight, letterSpacing, color: colors.textPrimary };
}

/** Figma text styles. Spread one into a StyleSheet entry and override only the colour. */
export const type = {
  displayAmount: textStyle(fonts.bold, 32, 38, -1.5),
  displayLarge: textStyle(fonts.bold, 26, 32, -1),
  titleSection: textStyle(fonts.bold, 18, 24),
  titleCard: textStyle(fonts.semiBold, 15, 20),
  bodyDefault: textStyle(fonts.regular, 13, 18),
  labelStrong: textStyle(fonts.semiBold, 12, 16),
  labelDefault: textStyle(fonts.medium, 12, 16),
  labelTabActive: textStyle(fonts.semiBold, 11, 14),
  labelTab: textStyle(fonts.medium, 11, 14),
  // Figma lists letter spacing 8 (percent); 8% of 10px = 0.8px.
  overline: { ...textStyle(fonts.bold, 10, 12, 0.8), textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>;

const SHADOW_RGB = '0, 31, 41'; // #001F29

/** Figma effect styles as React Native `boxShadow` (works on iOS, Android and web). */
export const elevation = {
  low: { boxShadow: `0 2px 6px rgba(${SHADOW_RGB}, 0.08)` },
  mid: { boxShadow: `0 8px 20px rgba(${SHADOW_RGB}, 0.16)` },
  high: { boxShadow: `0 16px 40px rgba(${SHADOW_RGB}, 0.28)` },
  sheet: { boxShadow: `0 -6px 24px rgba(${SHADOW_RGB}, 0.12)` },
  pin: { boxShadow: `0 4px 8px rgba(${SHADOW_RGB}, 0.30)` },
  glass: { boxShadow: `0 8px 24px rgba(${SHADOW_RGB}, 0.16)` },
} as const satisfies Record<string, ViewStyle>;

/** Floating nav geometry (Figma "Floating Nav"): orb 64, pill padding 6, items 66 × 52, 8 gap. */
export const nav = {
  orb: 64,
  itemWidth: 66,
  pillPadding: 6,
  gap: 8,
  /** Distance from the bottom safe-area edge to the nav. */
  bottomOffset: 12,
  /** Bottom padding scrolling content needs so its last row clears the nav. */
  clearance: 64 + 12 + 24,
} as const;
