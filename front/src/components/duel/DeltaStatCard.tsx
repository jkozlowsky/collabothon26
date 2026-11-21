import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

type Props = {
  overline: string;
  /** Shown muted with an arrow when the value changed. */
  before?: string;
  after: string;
  caption: string;
  /** 0–1 bar under the value (level progress). */
  progress?: number;
  testID?: string;
};

/** Half-width result card: "1 084 → 1 102" or "Lv 12 → 13" with a caption. */
export function DeltaStatCard({ overline, before, after, caption, progress, testID }: Props) {
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.overline}>{overline}</Text>
      <View style={styles.values}>
        {before !== undefined && (
          <>
            <Text style={styles.before}>{before}</Text>
            <Icon name="arrow-right" size={16} color={colors.textMuted} />
          </>
        )}
        <Text style={styles.after}>{after}</Text>
      </View>
      {progress !== undefined && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }]} />
        </View>
      )}
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.sm,
    ...elevation.low,
  },
  overline: { ...type.overline, color: colors.textMuted },
  values: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  before: { ...type.titleSection, color: colors.textMuted },
  after: type.displayLarge,
  track: { height: 6, borderRadius: radii.bar, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandAccent },
  caption: { ...type.labelDefault, color: colors.textMuted },
});
