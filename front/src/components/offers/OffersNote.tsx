import { StyleSheet, Text } from 'react-native';

import { colors, type } from '@/constants/theme';

/** The line under the bank's offers: information about products, not a recommendation. */
export function OffersNote() {
  return (
    <Text style={styles.note} testID="offers-disclaimer">
      Listed by name, not ranked. This is information about the bank&apos;s products, not a recommendation for you. Compare the costs and read
      the key information before you decide.
    </Text>
  );
}

const styles = StyleSheet.create({
  note: { ...type.labelDefault, color: colors.textMuted },
});
