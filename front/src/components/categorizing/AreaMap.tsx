import { StyleSheet, View } from 'react-native';

import { AreaRow } from '@/components/categorizing/AreaRow';
import { spacing } from '@/constants/theme';
import type { AreaMark } from '@/lib/quickCheck';

/** Every area's level and bar, on the summary. */
export function AreaMap({ marks, testID }: { marks: AreaMark[]; testID?: string }) {
  return (
    <View style={styles.map} testID={testID}>
      {marks.map((mark) => (
        <AreaRow key={mark.area} mark={mark} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ map: { gap: spacing.md } });
