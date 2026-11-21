import { StyleSheet, Text, View } from 'react-native';

import { Diamond } from '@/components/categorizing/Diamond';
import { colors, radii, spacing, type } from '@/constants/theme';

const PILL = { width: 18, height: 8 };

export function MapLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.item}>
        <View style={styles.swatch}>
          <Diamond style={styles.diamond} />
        </View>
        <Text style={styles.text}>How confident you said you feel</Text>
      </View>
      <View style={styles.item}>
        <View style={styles.pill} />
        <Text style={styles.text}>What your answers show</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.mdPlus },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2 },
  swatch: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  diamond: { position: 'relative' },
  pill: { ...PILL, borderRadius: radii.pill, backgroundColor: colors.brandPrimary },
  text: { ...type.labelDefault, color: colors.textMuted },
});
