import { StyleSheet, View } from 'react-native';

import { AreaRow } from '@/components/categorizing/AreaRow';
import { spacing } from '@/constants/theme';
import type { AreaMark } from '@/lib/quickCheck';
import type { FocusArea } from '@/types/categorization';

type Props = {
  marks: AreaMark[];
  /** A one-line note per area, shown under its bar. */
  notes?: Partial<Record<FocusArea, string>>;
  testID?: string;
};

/** Every area's level and bar, on the summary. */
export function AreaMap({ marks, notes = {}, testID }: Props) {
  return (
    <View style={styles.map} testID={testID}>
      {marks.map((mark) => (
        <AreaRow key={mark.area} mark={mark} note={notes[mark.area]} noteTestID={`summary-gap-${mark.area}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ map: { gap: spacing.md } });
