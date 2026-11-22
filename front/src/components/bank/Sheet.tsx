import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView, ScrollView, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, motion, radii, spacing, type } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Shown left of the title, e.g. a back arrow in a multi-step flow. */
  onBack?: () => void;
  children: ReactNode;
  testID?: string;
};

/** Phone width on web, so a sheet over the centered phone frame is not as wide as the desktop. */
const MAX_WIDTH = 430;
/** Release past this distance (px) or speed (px/s) closes the sheet; anything less springs back. */
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 900;
/** Pulling up past the top moves the sheet by only this share of the finger's travel (rubber band). */
const RUBBER_BAND = 0.15;
/** Brings the 36 px header buttons up to a 44 px touch target. */
const ICON_BUTTON_HIT_SLOP = 4;
/** The JS driver on web (no native animated module there). */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
/** iOS-style sheet curve: quick start, long soft landing. One curve for open, close and snap-back. */
const SHEET_EASING = Easing.bezier(...motion.drawer);
const OPEN_MS = 380;
const CLOSE_MS = 260;
const SNAP_MS = 260;

/** Moves the sheet; `done` runs only if the animation was not interrupted. */
function slide(offset: Animated.Value, toValue: number, duration: number, done?: () => void) {
  Animated.timing(offset, { toValue, duration, easing: SHEET_EASING, useNativeDriver: USE_NATIVE_DRIVER }).start(({ finished }) => {
    if (finished) done?.();
  });
}

/**
 * Figma bottom sheet: 28 px top corners, 40 × 5 handle, 16 px side padding, sheet elevation.
 * Slides up from the bottom edge, follows a downward drag, and closes when flung or pulled far enough.
 * Built on RN Modal + core Animated + Gesture Handler, so it behaves the same on Android and web.
 */
export function Sheet({ visible, onClose, title, onBack, children, testID }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Stays mounted after `visible` turns false until the slide-out has finished.
  const [rendered, setRendered] = useState(visible);
  if (visible && !rendered) setRendered(true);
  // Reduced motion: every slide is instant, so the sheet appears and disappears in place.
  const reduced = useReducedMotion();

  // translateY of the sheet: 0 = fully open; sheetHeight = just below the screen edge.
  // Starts far below so nothing flashes before the sheet has been measured.
  const [offset] = useState(() => new Animated.Value(screenHeight));
  // Measured height. Animating exactly this far (not the whole screen) means the sheet is moving
  // on screen for the whole animation, with no dead time at the start or the end.
  const [sheetHeight, setSheetHeight] = useState(0);
  const opened = useRef(false);

  // First layout: start the slide-in only now, once the Modal window and content exist, so the
  // first frames are not dropped while Android builds the window.
  const onSheetLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h !== sheetHeight) setSheetHeight(h);
    if (visible && !opened.current) {
      opened.current = true;
      offset.setValue(h);
      slide(offset, 0, reduced ? 0 : OPEN_MS);
    }
  };

  // Opening is started by onSheetLayout; this effect handles closing and re-opening mid-close.
  // It acts only when `visible` flips, so a height change (e.g. the next transfer step) never
  // restarts a running animation.
  const lastVisible = useRef(visible);
  useEffect(() => {
    if (visible === lastVisible.current) return;
    lastVisible.current = visible;
    if (visible) {
      if (opened.current) slide(offset, 0, reduced ? 0 : OPEN_MS);
      return;
    }
    // Closed before its first layout: there is nothing to slide out, and without this it would stay mounted off-screen.
    if (!opened.current) {
      setRendered(false);
      return;
    }
    slide(offset, sheetHeight || screenHeight, reduced ? 0 : CLOSE_MS, () => {
      opened.current = false;
      setRendered(false);
    });
  }, [visible, offset, sheetHeight, screenHeight, reduced]);

  // Drag down to close, with Gesture Handler so it works on Android, where the native scroll view
  // would otherwise take the vertical drag. The pan runs alongside the content's scroll view and
  // only moves the sheet while the content is scrolled to the top.
  const scrollTop = useRef(0);
  const dragBase = useRef(0);
  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetY: 8,
    failOffsetX: [-20, 20],
    onBegin: () => {
      dragBase.current = 0;
    },
    onUpdate: (e) => {
      // While the content is still scrolling up, the finger's travel so far does not count.
      if (scrollTop.current > 0) {
        dragBase.current = e.translationY;
        return;
      }
      const dy = e.translationY - dragBase.current;
      offset.setValue(dy > 0 ? dy : dy * RUBBER_BAND);
    },
    onDeactivate: (e) => {
      const dy = e.translationY - dragBase.current;
      if (scrollTop.current <= 0 && (dy > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY)) onClose();
      else slide(offset, 0, reduced ? 0 : SNAP_MS);
    },
  });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollTop.current = e.nativeEvent.contentOffset.y;
  };

  // The backdrop fades with the sheet's position, so it lightens while you drag.
  const backdropOpacity = offset.interpolate({
    inputRange: [0, sheetHeight || screenHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent hardwareAccelerated>
      {/* A Modal is a separate native root, so gestures inside it need their own root view. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom + spacing.lg,
                transform: [{ translateY: offset }],
              },
            ]}
            testID={testID}
            onLayout={onSheetLayout}
          >
            <View style={styles.handleArea} accessibilityLabel="Drag down to close">
              <View style={styles.handle} />
            </View>
            {(title || onBack) && (
              <View style={styles.header}>
                {onBack && (
                  <Tappable
                    onPress={onBack}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    testID="sheet-back"
                    hitSlop={ICON_BUTTON_HIT_SLOP}
                    style={styles.iconButton}
                  >
                    <Icon name="chevron-left" size={20} color={colors.brandPrimary} />
                  </Tappable>
                )}
                <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
                  {title}
                </Text>
                <Tappable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  testID="sheet-close"
                  hitSlop={ICON_BUTTON_HIT_SLOP}
                  style={styles.iconButton}
                >
                  <Icon name="close" size={20} color={colors.brandPrimary} />
                </Tappable>
              </View>
            )}
            <ScrollView
              simultaneousWith={pan}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.content}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    maxHeight: '88%',
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.lg,
    ...elevation.sheet,
  },
  // Taller than the visible handle so it is easy to grab.
  handleArea: {
    alignItems: 'center',
    paddingTop: spacing.smPlus,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { ...type.titleSection, flex: 1 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandPrimarySoft,
  },
  content: { gap: spacing.smPlus, paddingBottom: spacing.xs },
});
