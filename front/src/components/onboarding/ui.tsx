import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion, type CSSStyle } from 'react-native-reanimated';

import type { IconName } from '@/constants/onboarding';
import { colors, fonts, radii, spacing } from '@/constants/theme';

/** Strong ease-out for UI; ease-in-out for things moving across the screen. */
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = cubicBezier(0.77, 0, 0.175, 1);

/** Pop-in for a mark that appears on selection (check, badge). Never from scale 0. */
export const POP_IN = {
  from: { opacity: 0, transform: [{ scale: 0.5 }] },
  '70%': { opacity: 1, transform: [{ scale: 1.12 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};

type AnimatedStyle = ComponentProps<typeof Animated.View>['style'];

type HapticKind = 'selection' | 'light' | 'success';

/** Haptics are a bonus on top of the visual: silent on web and never allowed to throw. */
export function haptic(kind: HapticKind) {
  if (Platform.OS === 'web') return;
  const p =
    kind === 'selection'
      ? Haptics.selectionAsync()
      : kind === 'light'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  p.catch(() => {});
}

type TappableProps = Omit<PressableProps, 'style' | 'children'> & {
  /** Style of the visible (scaling) element; may carry Reanimated transitions. */
  style?: AnimatedStyle;
  /** Style of the outer touch area, e.g. `flex: 1` when the tappable sits in a row. */
  containerStyle?: StyleProp<ViewStyle>;
  haptic?: HapticKind;
  /** Scale while the finger is down. 0.97 for buttons; smaller targets can go a bit further. */
  pressedScale?: number;
  children?: ReactNode;
};

/**
 * Pressable with physical press feedback: shrinks on press-in (120 ms) and springs back on release,
 * so the response starts before the tap completes. Colors and borders on `style` also cross-fade.
 */
export function Tappable({
  style,
  containerStyle,
  haptic: kind,
  pressedScale = 0.97,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: TappableProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={containerStyle}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (kind) haptic(kind);
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, motion.press, { transform: [{ scale: pressed ? pressedScale : 1 }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

type BigButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  /** Ghost text color on dark backgrounds. */
  onDark?: boolean;
  disabled?: boolean;
  testID?: string;
};

export function BigButton({ label, onPress, variant = 'primary', onDark, disabled, testID }: BigButtonProps) {
  const ghost = variant === 'ghost';
  return (
    <Tappable
      testID={testID}
      accessibilityRole="button"
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      haptic={ghost ? undefined : 'light'}
      style={[
        styles.button,
        ghost ? styles.buttonGhost : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
        motion.colors,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          ghost ? { color: onDark ? 'rgba(255,255,255,0.8)' : colors.textMuted } : { color: colors.brandPrimary },
          disabled && { color: colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </Tappable>
  );
}

export function IconTile({ icon, active, size = 44 }: { icon: IconName; active?: boolean; size?: number }) {
  return (
    <Animated.View
      style={[
        styles.tile,
        motion.colors,
        { width: size, height: size, backgroundColor: active ? colors.brandAccent : colors.bgTint },
      ]}
    >
      <Feather name={icon} size={Math.round(size / 2)} color={colors.brandPrimary} />
    </Animated.View>
  );
}

type StepHeaderProps = {
  /** The control on the left: `BackButton` in the survey; the quick check has none. */
  left?: ReactNode;
  /** The centre label, e.g. "Step 2 of 3". */
  label: string;
  /** How much of the track is filled, 0–1. */
  progress: number;
};

export function StepHeader({ left, label, progress }: StepHeaderProps) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepRow}>
        {left ?? <View style={styles.stepSpacer} />}
        <Text style={styles.stepText}>{label}</Text>
        <View style={styles.stepSpacer} />
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.trackFill, motion.size, { width: `${Math.min(1, progress) * 100}%` }]} />
      </View>
    </View>
  );
}

export function BackButton({ onPress, onDark }: { onPress: () => void; onDark?: boolean }) {
  return (
    <Tappable
      testID="onboarding-back"
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      hitSlop={8}
      pressedScale={0.9}
      style={[styles.back, onDark && styles.closeOnDark]}
    >
      <Feather name="chevron-left" size={20} color={onDark ? colors.textOnBrand : colors.brandPrimary} />
    </Tappable>
  );
}

/** Leaves onboarding without saving anything: back to where the user came from. */
export function CloseButton({ onPress, onDark }: { onPress: () => void; onDark?: boolean }) {
  return (
    <Tappable
      testID="onboarding-close"
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      hitSlop={8}
      pressedScale={0.9}
      style={[styles.back, onDark && styles.closeOnDark]}
    >
      <Feather name="x" size={18} color={onDark ? colors.textOnBrand : colors.brandPrimary} />
    </Tappable>
  );
}

/** Fades and slides its children in on mount. Re-key it to replay on step change. */
export function FadeIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return <Animated.View style={[style, reduced ? motion.fade : motion.enter]}>{children}</Animated.View>;
}

/** Rises into place once on mount, after `delay` ms: staggers a headline block line by line. */
export function Rise({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        style,
        reduced
          ? motion.fade
          : {
              animationName: { from: { opacity: 0, transform: [{ translateY: 16 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
              animationDuration: 560,
              animationDelay: delay,
              animationFillMode: 'backwards',
              animationTimingFunction: EASE_OUT,
            },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export const type = StyleSheet.create({
  display: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, color: colors.textPrimary },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  overline: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, color: colors.feedbackXp },
  strong: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textPrimary },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
});

/** Shared motion styles (Reanimated CSS transitions and animations; they run on the UI thread). */
export const motion = {
  press: { transitionProperty: 'transform', transitionDuration: 120, transitionTimingFunction: EASE_OUT },
  colors: {
    transitionProperty: ['backgroundColor', 'borderColor', 'opacity'],
    transitionDuration: 200,
    transitionTimingFunction: EASE_OUT,
  },
  /** Width of childless bars (progress fill, page dot). */
  size: {
    transitionProperty: ['width', 'backgroundColor'],
    transitionDuration: 320,
    transitionTimingFunction: EASE_IN_OUT,
  },
  pop: { animationName: POP_IN, animationDuration: 260, animationTimingFunction: EASE_OUT },
  enter: {
    animationName: { from: { opacity: 0, transform: [{ translateX: 18 }] }, to: { opacity: 1, transform: [{ translateX: 0 }] } },
    animationDuration: 320,
    animationTimingFunction: EASE_OUT,
  },
  fade: { animationName: { from: { opacity: 0 }, to: { opacity: 1 } }, animationDuration: 200 },
  /** Content that swaps in place (a card showing another lesson). Re-key to replay. */
  swap: {
    animationName: { from: { opacity: 0, transform: [{ translateY: 6 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
    animationDuration: 240,
    animationTimingFunction: EASE_OUT,
  },
} satisfies Record<string, CSSStyle>;

const styles = StyleSheet.create({
  button: { height: 52, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.brandAccent },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDisabled: { backgroundColor: colors.borderDefault },
  buttonLabel: { fontFamily: fonts.semiBold, fontSize: 15 },
  tile: { borderRadius: radii.tile, alignItems: 'center', justifyContent: 'center' },
  stepHeader: { gap: spacing.lg },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textMuted },
  // As big as the back button: the label stays centred and the row keeps its height with no control beside it.
  stepSpacer: { width: 36, height: 36 },
  closeOnDark: { backgroundColor: colors.onBrandTile, borderColor: colors.onBrandTile },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3, backgroundColor: colors.brandAccent },
});
