import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView, ScrollView, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

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
/** The JS driver on web (no native animated module there). */
const NATIVE = Platform.OS !== 'web';

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

  // 0 = fully open; screenHeight = below the screen.
  const [offset] = useState(() => new Animated.Value(screenHeight));

  useEffect(() => {
    if (visible) {
      Animated.spring(offset, {
        toValue: 0,
        damping: 26,
        stiffness: 260,
        mass: 1,
        useNativeDriver: NATIVE,
      }).start();
    } else {
      Animated.timing(offset, {
        toValue: screenHeight,
        duration: 220,
        useNativeDriver: NATIVE,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, offset, screenHeight]);

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
      // Pulling up past the top only gives a little (rubber band).
      offset.setValue(dy > 0 ? dy : dy * 0.15);
    },
    onDeactivate: (e) => {
      const dy = e.translationY - dragBase.current;
      if (scrollTop.current <= 0 && (dy > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY)) onClose();
      else
        Animated.spring(offset, {
          toValue: 0,
          damping: 24,
          stiffness: 300,
          useNativeDriver: NATIVE,
        }).start();
    },
  });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollTop.current = e.nativeEvent.contentOffset.y;
  };

  // The backdrop fades with the sheet's position, so it lightens while you drag.
  const backdropOpacity = offset.interpolate({
    inputRange: [0, screenHeight * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
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
    paddingTop: 10,
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
  content: { gap: 10, paddingBottom: spacing.xs },
});
