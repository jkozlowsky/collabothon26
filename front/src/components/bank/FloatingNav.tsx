import type { BottomTabBarProps } from 'expo-router/tabs';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/bank/Glass';
import { Icon } from '@/components/bank/Icon';
import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, elevation, nav, radii, type } from '@/constants/theme';
import { useOpenLearn } from '@/hooks/useOpenLearn';
import { setAtlasDot, setOrbMeasure, useAtlasDot } from '@/lib/atlasOrb';
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
    { route: 'map', label: 'Map', icon: 'globe', href: '/map' },
    { route: 'glossary', label: 'Glossary', icon: 'book', href: '/glossary' },
    { route: 'duel', label: 'Duel', icon: 'swords', href: '/duel' },
    { route: 'profile', label: 'Profile', icon: 'user', href: '/profile' },
  ],
};

/** Shared spring-free move for the morph: the orb slides across, the pill resizes. */
const MORPH = LinearTransition.duration(320);

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
  const activeRoute = pathname.replace(/^\//, '') || 'index';
  const groupKey = (name: string) => state.routes.find((r) => r.name === name)!.key;

  // The Atlas popup flies into this button when it closes (AtlasNudge); the dot stays until it is tapped.
  const orbRef = useRef<ComponentRef<typeof View>>(null);
  const dot = useAtlasDot() && mode === 'bank';
  useEffect(() => {
    if (mode !== 'bank') return setOrbMeasure(null);
    setOrbMeasure((done) => {
      if (!orbRef.current) return done(null);
      orbRef.current.measureInWindow((x, y, width, height) => done(width ? { x, y, width, height } : null));
    });
    return () => setOrbMeasure(null);
  }, [mode]);

  // Switching by tab key (not by URL) brings back the tab the user left on that side.
  const onOrb = () => {
    setAtlasDot(false);
    if (mode === 'bank') openLearn('/map', () => navigateToTab(groupKey('(learn)')));
    else navigateToTab(groupKey('(bank)'));
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + nav.bottomOffset }]}>
      {/* Bank: pill then orb. Learn: orb then pill. `row-reverse` swaps them and the layout transition slides it. */}
      <View style={[styles.row, mode === 'learn' && styles.rowReverse]}>
        <Animated.View layout={MORPH}>
          <Glass style={styles.pill}>
            {ITEMS[mode].map((item) => (
              <Animated.View key={`${mode}-${item.route}`} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} layout={MORPH}>
                <NavItem item={item} active={item.route === activeRoute} />
              </Animated.View>
            ))}
          </Glass>
        </Animated.View>
        <Animated.View layout={MORPH}>
          <View ref={orbRef} collapsable={false}>
            <Tappable
              testID={mode === 'bank' ? 'nav-learn' : 'nav-bank'}
              accessibilityRole="button"
              accessibilityLabel={mode === 'bank' ? (dot ? 'Open Atlas, a lesson is waiting' : 'Open Atlas') : 'Back to the bank'}
              haptic="light"
              pressedScale={0.94}
              onPress={onOrb}
              style={[styles.orb, mode === 'bank' ? styles.orbLearn : styles.orbBank]}
            >
              <Animated.View key={mode} entering={FadeIn.duration(220)} style={styles.orbInner}>
                <Icon name={mode === 'bank' ? 'globe' : 'card'} size={22} color={colors.brandPrimary} />
                <Text style={styles.orbLabel}>{mode === 'bank' ? 'Atlas' : 'Bank'}</Text>
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
    gap: 2,
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
  orbInner: { alignItems: 'center', gap: 2 },
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
