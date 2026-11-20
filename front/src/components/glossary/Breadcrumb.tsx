import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';

export type Crumb = { label: string; onPress?: () => void };

type Props = {
  crumbs: Crumb[];
};

/** "Glossary › Stock › ETF". Past steps are links, the last one is the current term. Long trails collapse to "… › A › B". */
export function Breadcrumb({ crumbs }: Props) {
  const shown = crumbs.length > 3 ? [{ ...crumbs[0], label: '…' }, ...crumbs.slice(-2)] : crumbs;
  return (
    <View style={styles.row} testID="breadcrumb" accessibilityLabel={`Path: ${crumbs.map((c) => c.label).join(', ')}`}>
      {shown.map((crumb, i) => {
        const last = i === shown.length - 1;
        return (
          <View key={`${i}-${crumb.label}`} style={styles.item}>
            {last ? (
              <Text style={styles.current} numberOfLines={1}>
                {crumb.label}
              </Text>
            ) : (
              <Pressable accessibilityRole="link" accessibilityLabel={crumb.label} onPress={crumb.onPress} hitSlop={10}>
                <Text style={styles.link}>{crumb.label}</Text>
              </Pressable>
            )}
            {!last && <Text style={styles.separator}>›</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  link: { ...type.labelDefault, color: colors.globeOceanLight },
  current: { ...type.labelStrong, flexShrink: 1 },
  separator: { ...type.labelDefault, color: colors.textMuted },
});
