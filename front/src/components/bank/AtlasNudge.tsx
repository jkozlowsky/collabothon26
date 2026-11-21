import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/bank/Icon';
import { GlobeSphere } from '@/components/onboarding/Globe';
import { haptic, Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { measureOrb, setAtlasDot } from '@/lib/atlasOrb';
import type { FqTeaser } from '@/types/bank';

/** Pause after the tab opens, so the user sees the bank before Atlas speaks. */
const DELAY_MS = 1200;
/** How long the popup stays when nobody touches it; the timer bar runs down over this time. */
const VISIBLE_MS = 5000;
/** Off-screen start: above the top edge, shadow included. */
const HIDDEN_Y = -200;
const OPEN_MS = 420;
const CLOSE_MS = 240;
const FLY_MS = 560;
/** A measure that never answers (tests, an unmounted nav) must not leave the popup stuck. */
const MEASURE_TIMEOUT_MS = 150;
/** Swipe up past this distance (px) or speed (px/s) dismisses; anything less springs back. */
const DISMISS_DISTANCE = 40;
const DISMISS_VELOCITY = 600;
const NATIVE = Platform.OS !== 'web';
const EASE = Easing.bezier(0.32, 0.72, 0, 1);
/** The fly-in: a slow start, then it drops into the button. */
const FLY_EASE = Easing.bezier(0.55, 0, 0.75, 0.35);

/**
 * Popups already shown in this app session, by placement and lesson. A tab shows its popup once,
 * and again only when what it points to changes (the next lesson, or onboarding done).
 */
const seen = new Set<string>();

/** Test helper: forget which popups were shown. */
export function resetAtlasNudges() {
  seen.clear();
}

type Props = {
  /** Bank tab the popup belongs to; part of the "already shown" key. */
  placement: string;
  teaser: FqTeaser;
  /** False until the lesson data and profile are in, so the popup does not show text that then changes. */
  ready: boolean;
  /** Days in a row, shown after the meta line when above 0. */
  streak?: number;
  onOpen: (teaser: FqTeaser) => void;
  testID?: string;
};

const timing = (value: Animated.Value, toValue: number, duration: number, easing = EASE) =>
  Animated.timing(value, { toValue, duration, easing, useNativeDriver: NATIVE });

/**
 * Atlas as an in-app notification: slides down from the top of a bank tab a moment after it opens.
 * A bar at the bottom runs down until it leaves; touching the popup pauses it. When it runs out or is
 * closed, the popup flies into the Atlas button in the nav, which keeps a dot: that is where Atlas lives.
 * Tap opens the lesson; a swipe up just puts it away.
 */
export function AtlasNudge({ placement, teaser, ready, streak = 0, onOpen, testID }: Props) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const [anim] = useState(() => ({
    y: new Animated.Value(HIDDEN_Y),
    x: new Animated.Value(0),
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
    /** 1 → 0 while the popup counts down. */
    left: new Animated.Value(1),
  }));
  const [shown, setShown] = useState<FqTeaser | null>(null);
  const slot = useRef<ComponentRef<typeof View>>(null);
  /** Countdown left when it was paused, as a share of VISIBLE_MS. */
  const remaining = useRef(1);
  const leaving = useRef(false);
  const key = `${placement}:${teaser.personal ? 'new' : 'learner'}:${teaser.lessonId ?? teaser.storyId}`;

  const stopCountdown = () => anim.left.stopAnimation((v) => (remaining.current = v));

  const finish = () => {
    leaving.current = false;
    setShown(null);
  };

  /** Slides back up and out: a swipe, a tab switch, or the tap that opens the lesson. */
  const hide = () => {
    if (leaving.current) return;
    leaving.current = true;
    stopCountdown();
    timing(anim.y, HIDDEN_Y, reduced ? 0 : CLOSE_MS).start(finish);
  };

  /** Shrinks into the Atlas button in the nav, which then shows a dot. */
  const flyToOrb = () => {
    if (leaving.current) return;
    leaving.current = true;
    stopCountdown();
    const land = () => {
      setAtlasDot(true);
      haptic('light');
      finish();
    };
    let answered = false;
    const fallback = setTimeout(() => {
      if (answered) return;
      answered = true;
      timing(anim.y, HIDDEN_Y, CLOSE_MS).start(land);
    }, MEASURE_TIMEOUT_MS);
    measureOrb((orb) => {
      slot.current?.measureInWindow((sx, sy, sw, sh) => {
        if (answered) return;
        answered = true;
        clearTimeout(fallback);
        if (reduced || !orb || !sw) return timing(anim.opacity, 0, reduced ? 0 : CLOSE_MS).start(land);
        const dx = orb.x + orb.width / 2 - (sx + sw / 2);
        const dy = orb.y + orb.height / 2 - (sy + sh / 2);
        // Scale to the button's size, so the card seems to go into it.
        const to = Math.max(orb.width / sw, 0.08);
        Animated.parallel([
          timing(anim.x, dx, FLY_MS, FLY_EASE),
          timing(anim.y, dy, FLY_MS, FLY_EASE),
          timing(anim.scale, to, FLY_MS, FLY_EASE),
          Animated.sequence([Animated.delay(FLY_MS * 0.6), timing(anim.opacity, 0, FLY_MS * 0.4)]),
        ]).start(land);
      });
    });
  };

  /** Runs the bar down from where it stopped; when it reaches the end the popup flies away. */
  const countdown = () => {
    if (leaving.current) return;
    timing(anim.left, 0, remaining.current * VISIBLE_MS, Easing.linear).start(({ finished }) => finished && flyToOrb());
  };

  // Show once the tab is focused and the data is in; leave when the user switches tabs.
  useEffect(() => {
    if (!focused) {
      if (shown) hide();
      return;
    }
    if (!ready || seen.has(key)) return;
    const timer = setTimeout(() => {
      seen.add(key);
      leaving.current = false;
      remaining.current = 1;
      anim.x.setValue(0);
      anim.scale.setValue(1);
      anim.opacity.setValue(1);
      anim.left.setValue(1);
      setShown(teaser);
      haptic('light');
      timing(anim.y, 0, reduced ? 0 : OPEN_MS).start();
      countdown();
    }, DELAY_MS);
    return () => clearTimeout(timer);
    // `teaser` is read when the timer fires; `key` covers the part of it that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, ready, key]);

  useEffect(() => () => anim.left.stopAnimation(), [anim]);

  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetY: [-8, 8],
    failOffsetX: [-20, 20],
    onBegin: stopCountdown,
    onUpdate: (e) => anim.y.setValue(e.translationY < 0 ? e.translationY : e.translationY * 0.15),
    onDeactivate: (e) => {
      if (-e.translationY > DISMISS_DISTANCE || -e.velocityY > DISMISS_VELOCITY) return hide();
      timing(anim.y, 0, reduced ? 0 : CLOSE_MS).start();
      countdown();
    },
  });

  if (!shown) return null;

  const open = () => {
    hide();
    setAtlasDot(false);
    onOpen(shown);
  };

  const transform = [{ translateX: anim.x }, { translateY: anim.y }, { scale: anim.scale }];

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <GestureDetector gesture={pan}>
        <Animated.View ref={slot} style={[styles.slot, { opacity: anim.opacity, transform }]} accessibilityLiveRegion="polite">
          <Tappable
            onPress={open}
            onPressIn={stopCountdown}
            onPressOut={countdown}
            accessibilityRole="button"
            accessibilityLabel={`Atlas: ${shown.title}. ${shown.meta}`}
            accessibilityHint={shown.personal ? 'Opens Atlas, a short lesson about this' : 'Opens the lesson'}
            testID={testID}
            pressedScale={0.98}
            style={styles.card}
          >
            <View style={styles.globe}>
              <GlobeSphere size={40} />
            </View>
            <View style={styles.body}>
              <Text style={styles.overline}>{shown.personal ? 'Atlas · from your numbers' : 'Atlas · now'}</Text>
              <Text style={styles.title} numberOfLines={shown.personal ? 3 : 1}>
                {shown.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {streak > 0 && !shown.personal ? `${shown.meta} · ${streak}-day streak` : shown.meta}
              </Text>
              {!shown.personal && (
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(shown.progress * 100)}%` }]} />
                </View>
              )}
            </View>
            {/* Time left before the popup goes into the Atlas button. Pauses while touched. */}
            <Animated.View pointerEvents="none" testID={testID && `${testID}-timer`} style={[styles.timer, { transform: [{ scaleX: anim.left }] }]} />
          </Tappable>
          <Pressable onPress={flyToOrb} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" testID={testID && `${testID}-dismiss`} style={styles.close}>
            <Icon name="close" size={16} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.md },
  slot: { width: '100%', maxWidth: 430 - spacing.md * 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderColor: colors.brandAccent,
    borderWidth: 1.5,
    borderRadius: radii.card,
    overflow: 'hidden',
    paddingTop: spacing.md,
    paddingBottom: spacing.md + 2,
    paddingLeft: spacing.md,
    paddingRight: 40,
    ...elevation.high,
  },
  globe: { width: 40, height: 40 },
  body: { flex: 1, gap: 2 },
  overline: { ...type.overline, color: colors.brandPrimary },
  title: type.titleCard,
  meta: { ...type.labelDefault, color: colors.textMuted },
  track: { width: 150, maxWidth: '100%', height: 4, borderRadius: radii.bar, backgroundColor: colors.borderDefault, marginTop: spacing.xs, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandPrimary },
  timer: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: colors.brandAccent, transformOrigin: 'left' },
  close: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: spacing.xs },
});
