import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';

type Props = {
  overline: string;
  title: string;
  titleTestID?: string;
  /** Stat chips under the title. */
  children?: ReactNode;
};

/** Overline + large title + chip row, the top of the waiting and result screens. */
export function DuelHeading({ overline, title, titleTestID, children }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.overline}>{overline}</Text>
      <Text style={type.displayLarge} accessibilityRole="header" testID={titleTestID}>
        {title}
      </Text>
      {children ? <View style={styles.chips}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  overline: { ...type.overline, color: colors.feedbackXp },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});
