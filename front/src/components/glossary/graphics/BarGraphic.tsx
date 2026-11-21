import { StyleSheet, Text, View } from 'react-native';

import { GraphicFrame } from '@/components/glossary/graphics/GraphicFrame';
import { colors, radii, spacing, type } from '@/constants/theme';

export type Bar = { label: string; valueLabel: string; value: number };

type Props = {
  title: string;
  caption: string;
  testID: string;
  bars: Bar[];
  /** Index of the bar drawn in petrol; the others are ocean blue. */
  emphasis: number;
};

const MAX_HEIGHT = 104;
const MIN_HEIGHT = 8;

/** Simple bar chart drawn with Views (heights are relative to the largest value). */
export function BarGraphic({ title, caption, testID, bars, emphasis }: Props) {
  const max = Math.max(...bars.map((b) => b.value));
  return (
    <GraphicFrame title={title} caption={caption} testID={testID}>
      <View style={styles.row}>
        {bars.map((bar, i) => (
          <View key={bar.label} style={styles.column}>
            <Text style={type.labelStrong}>{bar.valueLabel}</Text>
            <View
              style={[
                styles.bar,
                { height: Math.max(MIN_HEIGHT, (bar.value / max) * MAX_HEIGHT) },
                { backgroundColor: i === emphasis ? colors.brandPrimary : colors.globeOceanLight },
              ]}
            />
            <Text style={styles.label}>{bar.label}</Text>
          </View>
        ))}
      </View>
    </GraphicFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  column: { flex: 1, alignItems: 'center', gap: spacing.xs },
  bar: { alignSelf: 'stretch', borderRadius: radii.button - 2 },
  label: { ...type.labelDefault, color: colors.textMuted },
});
