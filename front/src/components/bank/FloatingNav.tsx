import type { BottomTabBarProps } from 'expo-router/tabs';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/bank/Glass';
import { Icon } from '@/components/bank/Icon';
import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, elevation, nav, radii, spacing, type } from '@/constants/theme';
import { useOpenLearn } from '@/hooks/useOpenLearn';
import { registerOrbMeasure, setAtlasDot, useAtlasDot } from '@/lib/atlasOrb';
import type { BankIconName } from '@/types/bank';

type Mode = 'bank' | 'learn';

type Item = { route: string; label: string; icon: BankIconName; href: Href };

const ITEMS: Record<Mode, Item[]> = {
  bank: [
    { route: 'index', label: 'Overview', icon: 'home', href: '/' },
    { route: 'payments', label: 'Payments', icon: 'transfer', href: '/payments' },
    { route: 'credits', label: 'Credits', icon: 'percent', href: '/credits' },
    { route: 'invest', label: 'Invest', icon: 'trending', href: '/invest' },
  ],
  learn: [
    { route: 'map', label: 'Atlas', icon: 'globe', href: '/map' },
    { route: 'glossary', label: 'Glossary', icon: 'book', href: '/glossary' },
    { route: 'duel', label: 'Duel', icon: 'swords', href: '/duel' },
    { route: 'profile', label: 'Profile', icon: 'user', href: '/profile' },
  ],
};

/** The orb leads to the other side of the app. */
const ORB: Record<Mode, { testID: string; label: string; icon: BankIconName; text: string }> = {
  bank: { testID: 'nav-learn', label: 'Open Atlas', icon: 'globe', text: 'Atlas' },
  learn: { testID: 'nav-bank', label: 'Back to the bank', icon: 'card', text: 'Bank' },
};

const MORPH_MS = 320;
const FADE_IN_MS = 220;
const FADE_OUT_MS = 120;
/** Shared spring-free move for the morph: the orb slides across, the pill resizes. */
const MORPH = LinearTransition.duration(MORPH_MS);

/**
 * Figma "Floating Nav". One component for both sides of the app, used as the tab bar of the
 * outer (main) navigator, so it stays mounted and morphs between the bank tabs + Learn orb
 * and the Learn tabs + Bank orb.
 */
export function FloatingNav({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const openLearn = useOpenLearn();

  const pathname = usePathname();

  const mode: Mode = state.routes[state.index].name === '(learn)' ? 'learn' : 'bank';
  // Group routes have no path segment, so "/" is Overview and "/payments" is Payments.
  // Only the first segment picks the tab, so a nested screen ("/glossary/<slug>") keeps its tab lit.
  const activeRoute = pathname.split('/')[1] || 'index';
  const orb = ORB[mode];

  // The Atlas popup flies into this button when it closes (AtlasNudge); the dot stays until it is tapped.
  const orbRef = useRef<ComponentRef<typeof View>>(null);
  const dot = useAtlasDot() && mode === 'bank';
  useEffect(() => {
    if (mode !== 'bank') return;
    return registerOrbMeasure((done) => {
      if (!orbRef.current) return done(null);
      orbRef.current.measureInWindow((x, y, width, height) => done(width ? { x, y, width, height } : null));
    });
  }, [mode]);

  // Switching by tab key (not by URL) brings back the tab the user left on that side.
  const switchTo = (group: '(bank)' | '(learn)') => {
    const route = state.routes.find((r) => r.name === group);
    if (route) navigateToTab(route.key);
  };

  const onOrb = () => {
    setAtlasDot(false);
    if (mode === 'bank') openLearn('/map', () => switchTo('(learn)'));
    else switchTo('(bank)');
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + nav.bottomOffset }]}>
      {/* Bank: pill then orb. Learn: orb then pill. `row-reverse` swaps them and the layout transition slides it. */}
      <View style={[styles.row, mode === 'learn' && styles.rowReverse]}>
        <Animated.View layout={MORPH}>
          <Glass style={styles.pill}>
            {ITEMS[mode].map((item) => (
              <Animated.View key={`${mode}-${item.route}`} entering={FadeIn.duration(FADE_IN_MS)} exiting={FadeOut.duration(FADE_OUT_MS)} layout={MORPH}>
                <NavItem item={item} active={item.route === activeRoute} />
              </Animated.View>
            ))}
          </Glass>
        </Animated.View>
        <Animated.View layout={MORPH}>
          <View ref={orbRef} collapsable={false}>
            <Tappable
              testID={orb.testID}
              accessibilityRole="button"
              accessibilityLabel={dot ? 'Open Atlas, a lesson is waiting' : orb.label}
              haptic="light"
              pressedScale={0.94}
              onPress={onOrb}
              style={[styles.orb, mode === 'bank' ? styles.orbLearn : styles.orbBank]}
            >
              <Animated.View key={mode} entering={FadeIn.duration(FADE_IN_MS)} style={styles.orbInner}>
                <Icon name={orb.icon} size={22} color={colors.brandPrimary} />
                <Text style={styles.orbLabel}>{orb.text}</Text>
              </Animated.View>
            </Tappable>
            {/* Lands with the popup: a pop, then a quiet dot until the user opens Atlas. */}
            {dot && <Animated.View pointerEvents="none" testID="nav-learn-dot" style={[styles.dot, motion.pop]} />}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function NavItem({ item, active }: { item: Item; active: boolean }) {
  return (
    <Tappable
      testID={`nav-${item.route === 'index' ? 'overview' : item.route}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      haptic="selection"
      onPress={() => router.navigate(item.href)}
      style={[styles.item, motion.colors, active && styles.itemActive]}
    >
      <Icon name={item.icon} size={22} color={active ? colors.textOnAccent : colors.textMuted} />
      <Text style={active ? styles.labelActive : styles.label} numberOfLines={1}>
        {item.label}
      </Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: nav.gap },
  rowReverse: { flexDirection: 'row-reverse' },
  pill: { flexDirection: 'row', padding: nav.pillPadding, borderRadius: radii.pill },
  item: {
    width: nav.itemWidth,
    paddingVertical: 7,
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
  },
  itemActive: { backgroundColor: colors.brandAccent },
  label: { ...type.labelTab, color: colors.textMuted },
  labelActive: { ...type.labelTabActive, color: colors.textOnAccent },
  orb: {
    width: nav.orb,
    height: nav.orb,
    borderRadius: radii.orb,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
    ...elevation.glass,
  },
  // Bank side: the way into Atlas, ringed in yellow ("your next step").
  orbLearn: { borderWidth: 2, borderColor: colors.brandAccent },
  // Learn side: a quiet glass-like way back.
  orbBank: { borderWidth: 1, borderColor: colors.glassBorder },
  orbInner: { alignItems: 'center', gap: spacing.xxs },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.brandPrimary,
    borderWidth: 2,
    borderColor: colors.bgSurface,
  },
  orbLabel: { ...type.labelTabActive, color: colors.textOnAccent },
});
