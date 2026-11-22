/**
 * Design tokens mirrored from the Figma Design Kit (file "Finance Quest — Globe Learn Screen", node 3:55).
 * Names follow the Figma variables: `brandPrimary` ↔ `brand/primary`, `type.titleCard` ↔ `Title/Card`.
 * Figma is the source of truth; change a value there first, then here.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  brandPrimary: '#002E3C',
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
  // Duel v3 review answer pills: feedback colours at 10%.
  feedbackSuccessTint: 'rgba(30, 138, 94, 0.1)',
  feedbackDangerTint: 'rgba(214, 69, 69, 0.1)',

  globeOceanLight: '#1B6F82',
  globeOceanDeep: '#002E3C',
  globeLand: '#CFE5DD',

  storyRose: '#D9577A',
  storyViolet: '#6E5AD6',
  storyOrange: '#E8833A',
  storyTeal: '#1E9AA8',
  storySlate: '#9AA5AB',

  // The drawn globe (components/onboarding/Globe.tsx: onboarding and the Atlas orb). Not Figma variables;
  // the pin colours are near-misses of the story colours and stay as drawn.
  sphereOceanLight: '#3C8C99',
  sphereOceanMid: '#0E4A59',
  sphereLand: '#D7EAE3',
  onboardingPinSlate: '#9AA6AB',
  onboardingPinViolet: '#7A5AF8',
  onboardingPinTeal: '#1F9AA0',
  /** The soft blob under the onboarding globe. */
  groundShadow: 'rgba(0, 0, 0, 0.25)',

  // Figma effect style "Glass/Nav": white 62% fill, white 95% 1px border, 24 background blur.
  glassFill: 'rgba(255, 255, 255, 0.62)',
  glassBorder: 'rgba(255, 255, 255, 0.95)',
  // Opaque stand-in where real blur is unavailable (Android), so the nav never looks see-through.
  glassFallback: 'rgba(255, 255, 255, 0.96)',
  // Bank hero cards: petrol gradient and the translucent tiles on top of it.
  heroGradientFrom: '#0B4D5E',
  onBrandTile: 'rgba(255, 255, 255, 0.08)',
  onBrandMuted: 'rgba(255, 255, 255, 0.7)',
  // Duel v3 level-up "from" chip: white at 12%.
  onBrandSubtle: 'rgba(255, 255, 255, 0.12)',
  // Duel matchmaking and versus cards: stronger labels, chips and hairlines on petrol.
  onBrandStrong: 'rgba(255, 255, 255, 0.85)',
  onBrandChip: 'rgba(255, 255, 255, 0.14)',
  onBrandHairline: 'rgba(255, 255, 255, 0.16)',
  onBrandDashed: 'rgba(255, 255, 255, 0.35)',
  /** Label of the ghost `BigButton` on the dark (petrol) onboarding screens: white at 80%. */
  onBrandGhost: 'rgba(255, 255, 255, 0.8)',
  cardChipGold: '#E9D49A',
  cardChipOnAccent: 'rgba(0, 46, 60, 0.18)',
  scrim: 'rgba(0, 31, 41, 0.4)',
  /** Darker dim behind a spotlight, so the one lit feature stands out. */
  spotlightScrim: 'rgba(0, 31, 41, 0.72)',
  /** Fill of the dashed drop zone in an empty bucket of the duel sort question: black at 1%, clear to the eye. */
  dropZoneFill: 'rgba(0, 0, 0, 0.01)',
  /** `shadowColor` of the selected duel match tile, the one place still on the iOS shadow props; everything else uses `elevation`. */
  legacyShadow: '#000',

  // Medal tokens (Figma Duel v3 Kit 166:5407)
  medalGold: '#B8860B',
  medalGoldSoft: '#FBF1D6',
  medalSilver: '#7D8A94',
  medalSilverSoft: '#EEF1F4',
  medalBronze: '#A0602E',
  medalBronzeSoft: '#F7E9DE',
} as const;

/** Story colours at 14% opacity: icon tiles and avatar backgrounds (Figma recipe). */
export const tints = {
  rose: 'rgba(217, 87, 122, 0.14)',
  violet: 'rgba(110, 90, 214, 0.14)',
  teal: 'rgba(30, 154, 168, 0.14)',
  orange: 'rgba(232, 131, 58, 0.14)',
  // Slate has two strengths that render differently: 20% (story tiles, avatars) and the 14% recipe.
  slate: 'rgba(154, 165, 171, 0.2)',
  slateSoft: 'rgba(154, 165, 171, 0.14)',
  xp: 'rgba(181, 139, 0, 0.14)',
  accent: 'rgba(255, 204, 0, 0.16)',
} as const;

/** Story and success colours at 12%: bucket and pair backgrounds in the duel sort and match questions. */
export const duelTints = {
  teal: 'rgba(30, 154, 168, 0.12)',
  violet: 'rgba(110, 90, 214, 0.12)',
  orange: 'rgba(232, 131, 58, 0.12)',
  rose: 'rgba(217, 87, 122, 0.12)',
  success: 'rgba(30, 138, 94, 0.12)',
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
  // Half steps that Figma components use (story card, small button, bottom sheet).
  smPlus: 10,
  md: 12,
  mdPlus: 14,
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
  // Not in the Figma scale: the Atlas wordmark on the welcome screen.
  displayHero: textStyle(fonts.bold, 56, 60, -2.5),
  displayAmount: textStyle(fonts.bold, 32, 38, -1.5),
  displayLarge: textStyle(fonts.bold, 26, 32, -1),
  titleSection: textStyle(fonts.bold, 18, 24),
  titleCard: textStyle(fonts.semiBold, 15, 20),
  bodyDefault: textStyle(fonts.regular, 13, 18),
  // Not in the Figma scale: reading size for glossary definitions (15/24 is easier to read than 13/18).
  bodyReading: textStyle(fonts.regular, 15, 24),
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

/** Shadows of the drawn onboarding illustrations. Not Figma effect styles: UI uses `elevation`. */
export const illustrationShadow = {
  pin: { boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)' },
  globe: { boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)' },
  bubble: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' },
  vsGlow: { boxShadow: '0 0 0 8px rgba(255, 204, 0, 0.16), 0 0 32px rgba(255, 204, 0, 0.45)' },
  card: { boxShadow: '0 6px 20px rgba(0, 46, 60, 0.08)' },
  cardRaised: { boxShadow: '0 8px 24px rgba(0, 46, 60, 0.16)' },
} as const satisfies Record<string, ViewStyle>;

/**
 * Easing curves as cubic-bezier control points. Tuples, because the call sites feed three easing APIs:
 * `cubicBezier(...motion.easeOut)` (Reanimated CSS), `Easing.bezierFn(...)` (Reanimated worklets),
 * `Easing.bezier(...)` (React Native core).
 */
export const motion = {
  /** Strong ease-out: UI answering the user (press, enter, pop, expand). */
  easeOut: [0.23, 1, 0.32, 1],
  /** Ease-in-out: something already on screen that moves or resizes. */
  easeInOut: [0.77, 0, 0.175, 1],
  /** iOS-style drawer: quick start, long soft landing (bottom sheet, Atlas popup). */
  drawer: [0.32, 0.72, 0, 1],
} as const;

/** Pressed state of a button-like Pressable: `pressed && pressFeedback`. */
export const pressFeedback: ViewStyle = { transform: [{ scale: 0.98 }], opacity: 0.9 };

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

/**
 * Lesson video player and scenes (.plans/lesson-video-mode-spec.md §3.2, §4.3): always dark, whatever the app
 * theme. Not Figma variables yet; the Shot kit board in Figma is where these get their final values.
 */
export const scenePalette = {
  surface: '#071419',
  onScene: '#FFFFFF',
  onSceneMuted: 'rgba(255, 255, 255, 0.78)',
  scrimStrong: 'rgba(0, 0, 0, 0.55)',
  scrimClear: 'rgba(0, 0, 0, 0)',
  captionPill: 'rgba(0, 0, 0, 0.62)',
  segmentDone: 'rgba(255, 255, 255, 0.95)',
  segmentNow: 'rgba(255, 255, 255, 0.62)',
  segmentTodo: 'rgba(255, 255, 255, 0.28)',
  progressTrack: 'rgba(255, 255, 255, 0.25)',
  pressed: 'rgba(255, 255, 255, 0.14)',
  /** Sky gradient, top to bottom, per time of day. */
  sky: {
    day: ['#1B6F82', '#4F9DB0', '#A9D3DC'],
    dusk: ['#2E3F7E', '#C9637A', '#F2A86F'],
    night: ['#070B22', '#141C46', '#2C2B5E'],
  },
  wall: { day: '#21343C', dusk: '#2B1C2C', night: '#131528' },
  floor: { day: '#18282F', dusk: '#1F1420', night: '#0C0E1C' },
  desk: '#3A4A52',
  skyline: '#0B1A22',
  windowLit: '#FFD98A',
  star: '#FFFFFF',
  phoneBody: '#0F1E24',
  phoneScreen: '#E9EEF0',
  phoneLight: '#BFE3EE',
  bubble: '#FFFFFF',
} as const;
