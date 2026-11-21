import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type Props = {
  node: ReactNode;
  /** The yellow station where the route ends: the first lesson. */
  end?: boolean;
  last?: boolean;
  testID?: string;
  children: ReactNode;
};

const NODE = 32;

export function RouteStation({ node, end, last, testID, children }: Props) {
  return (
    <View style={styles.station} testID={testID}>
      <View style={styles.track}>
        <View style={[styles.node, end && styles.nodeEnd]}>{node}</View>
        {!last && <View style={styles.line} />}
      </View>
      <View style={[styles.content, !last && styles.gap]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  station: { flexDirection: 'row', gap: spacing.mdPlus },
  track: { width: NODE, alignItems: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeEnd: { backgroundColor: colors.brandAccentSoft },
  line: { flex: 1, width: 2, backgroundColor: colors.brandPrimary },
  content: { flex: 1, minHeight: NODE, justifyContent: 'center' },
  gap: { paddingBottom: spacing.mdPlus },
});
