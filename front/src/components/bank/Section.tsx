import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Tappable } from '@/components/onboarding/ui';
import { colors, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  /** Link on the right: "See all", "Manage", "Add"… */
  action?: { label: string; onPress: () => void; testID?: string };
  children: ReactNode;
};

/** Brings the 16 px link up to a 44 px touch target; it stays inside the 12 px gap under the header. */
const ACTION_HIT_SLOP = 14;

/** A titled block of the bank page (Figma: Title/Section + Label/Strong link). */
export function Section({ title, action, children }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {action && (
          <Tappable onPress={action.onPress} accessibilityRole="button" testID={action.testID} hitSlop={ACTION_HIT_SLOP}>
            <Text style={styles.action}>{action.label}</Text>
          </Tappable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: type.titleSection,
  action: { ...type.labelStrong, color: colors.brandPrimary },
});
