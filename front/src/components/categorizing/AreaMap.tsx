import { StyleSheet, View } from 'react-native';

import { AreaRow } from '@/components/categorizing/AreaRow';
import { MapLegend } from '@/components/categorizing/MapLegend';
import { spacing } from '@/constants/theme';
import type { AreaMark } from '@/lib/quickCheck';

/** Both markers for every area, with their legend: the dock's detail sheet and the summary. */
export function AreaMap({ marks, testID }: { marks: AreaMark[]; testID?: string }) {
  return (
    <View style={styles.map} testID={testID}>
      {marks.map((mark) => (
        <AreaRow key={mark.area} mark={mark} />
      ))}
      <MapLegend />
    </View>
  );
}

const styles = StyleSheet.create({ map: { gap: spacing.md } });
