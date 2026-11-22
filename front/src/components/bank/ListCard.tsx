import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

/** White card holding ListRows, with hairline dividers between them. */
export function ListCard({ children, testID }: { children: ReactNode; testID?: string }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.card} testID={testID}>
      {rows.map((row, i) => (
        // Children.toArray gives every element a stable key; the index only covers plain text.
        <Fragment key={isValidElement(row) ? row.key : i}>
          {i > 0 && <View style={styles.divider} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.borderDefault, marginHorizontal: spacing.md },
});
