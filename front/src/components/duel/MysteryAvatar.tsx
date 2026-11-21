import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/constants/theme';

/** Dashed "?" seat for the rival who has not been found yet (matchmaking, petrol background). */
export function MysteryAvatar({ size }: { size: number }) {
  return (
    <View style={[styles.seat, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.mark}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    backgroundColor: colors.onBrandTile,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.onBrandDashed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { ...type.displayLarge, color: colors.onBrandMuted },
});
