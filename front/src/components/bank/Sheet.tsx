import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/bank/Icon';
import { EASE_OUT, Tappable } from '@/components/onboarding/ui';
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

/**
 * Figma bottom sheet: 28 px top corners, 40 × 5 handle, 16 px side padding, sheet elevation.
 * Built on RN Modal so it works the same on Android and web.
 */
export function Sheet({ visible, onClose, title, onBack, children, testID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <Animated.View style={[styles.sheet, slideUp, { paddingBottom: insets.bottom + spacing.lg }]} testID={testID}>
          <View style={styles.handle} />
          {(title || onBack) && (
            <View style={styles.header}>
              {onBack && (
                <Tappable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" testID="sheet-back" style={styles.iconButton}>
                  <Icon name="chevron-left" size={20} color={colors.brandPrimary} />
                </Tappable>
              )}
              <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
                {title}
              </Text>
              <Tappable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" testID="sheet-close" style={styles.iconButton}>
                <Icon name="close" size={20} color={colors.brandPrimary} />
              </Tappable>
            </View>
          )}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Reanimated CSS animation (kept out of StyleSheet, which does not know animation props). */
const slideUp = {
  animationName: { from: { transform: [{ translateY: 80 }], opacity: 0.6 }, to: { transform: [{ translateY: 0 }], opacity: 1 } },
  animationDuration: 280,
  animationTimingFunction: EASE_OUT,
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    maxHeight: '88%',
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
    ...elevation.sheet,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: radii.pill, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
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
