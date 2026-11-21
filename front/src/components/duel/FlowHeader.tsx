import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconButton } from '@/components/bank/IconButton';
import { motion } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  onClose: () => void;
  closeLabel: string;
  closeTestID?: string;
  /** Centre label ("Question 3 of 6"). */
  title: string;
  titleTestID?: string;
  /** Right slot (the timer chip); empty keeps the title centred. */
  right?: ReactNode;
  /** 0–1 fill of the yellow progress bar. */
  progress: number;
};

/** Match header: close, counter, timer, then the progress bar (Figma "Duel — Question"). */
export function FlowHeader({ onClose, closeLabel, closeTestID, title, titleTestID, right, progress }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <IconButton icon="close" label={closeLabel} onPress={onClose} testID={closeTestID} />
        <Text style={styles.title} testID={titleTestID}>
          {title}
        </Text>
        <View style={styles.right}>{right}</View>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, motion.size, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.labelDefault, color: colors.textMuted },
  // Same width as the close button so the title stays centred.
  right: { minWidth: 40, alignItems: 'flex-end' },
  track: { height: 6, borderRadius: radii.bar, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandAccent },
});
