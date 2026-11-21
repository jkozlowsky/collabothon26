import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/constants/theme';

type Props = { current: number; total: number };

const DOT = 28;

/** The loading screen's stations laid flat: petrol once answered, never green, because no answer is "correct". */
export function QuestionTrack({ current, total }: Props) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Question ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={i <= current ? styles.linkDone : styles.linkNext} />}
          <View style={[styles.dot, i < current ? styles.done : i === current ? styles.now : styles.next]}>
            <Text style={[styles.number, i < current && styles.numberDone]}>{i + 1}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xxs },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  now: { backgroundColor: colors.brandAccentSoft, borderColor: colors.brandPrimary },
  next: { backgroundColor: colors.bgSurface, borderColor: colors.borderStrong },
  number: { ...type.labelStrong, color: colors.textMuted },
  numberDone: { color: colors.textOnBrand },
  linkDone: { flex: 1, height: 2, backgroundColor: colors.brandPrimary },
  linkNext: { flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.borderStrong },
});
