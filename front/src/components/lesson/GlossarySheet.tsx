import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Sheet } from '@/components/bank/Sheet';
import { colors, spacing, type } from '@/constants/theme';
import type { GlossaryEntry } from '@/types/lessons';

type Props = {
  entry?: GlossaryEntry;
  onClose: () => void;
  /** Opens the full Glossary tab. */
  onMore: () => void;
};

/** Definition of a [[concept]] over the lesson, without leaving it. */
export function GlossarySheet({ entry, onClose, onMore }: Props) {
  return (
    <Sheet visible={!!entry} onClose={onClose} title={entry?.term} testID="glossary-sheet">
      <View style={styles.body}>
        <Text style={styles.definition}>{entry?.definition}</Text>
        <Button label="More in Glossary" variant="secondary" onPress={onMore} testID="glossary-more" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.sm },
  definition: { ...type.bodyDefault, color: colors.textPrimary },
});
