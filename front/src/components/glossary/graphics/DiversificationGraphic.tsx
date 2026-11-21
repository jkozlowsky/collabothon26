import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { GraphicFrame } from '@/components/glossary/graphics/GraphicFrame';
import { colors, radii, spacing, type } from '@/constants/theme';

const PANEL = 120;

/** Two baskets: all money in one company vs. spread over many. The same single company struggles in both. */
export function DiversificationGraphic() {
  return (
    <GraphicFrame
      title="One company struggles"
      caption="All in one company, the loss is the whole basket. Spread out, it is a small part."
      testID="graphic-diversification"
    >
      <View style={styles.row}>
        <Panel label="All in one">
          <Circle cx={PANEL / 2} cy={PANEL / 2} r={38} fill={colors.feedbackDanger} />
        </Panel>
        <Panel label="Spread out">
          {Array.from({ length: 9 }, (_, i) => (
            <Circle
              key={i}
              cx={22 + (i % 3) * 38}
              cy={22 + Math.floor(i / 3) * 38}
              r={13}
              fill={i === 4 ? colors.feedbackDanger : colors.globeOceanLight}
            />
          ))}
        </Panel>
      </View>
    </GraphicFrame>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <View style={styles.basket}>
        <Svg width={PANEL} height={PANEL}>
          {children}
        </Svg>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  panel: { alignItems: 'center', gap: spacing.sm },
  basket: { borderRadius: radii.card, backgroundColor: colors.bgCanvas, borderWidth: 1, borderColor: colors.borderDefault },
  label: type.labelStrong,
});
