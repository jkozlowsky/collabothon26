import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors, elevation, radii } from '@/constants/theme';

export const PLANE_SIZE = 32;
/** The glyph's nose points this many radians from screen "right"; the globe adds the flight heading. */
export const PLANE_NOSE = 0;

/** The plane that flies between pins. Position and heading are set by the globe on the UI thread. */
export function Plane() {
  return (
    <View style={styles.plane} pointerEvents="none">
      <Ionicons name="airplane" size={20} color={colors.brandPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  plane: {
    width: PLANE_SIZE,
    height: PLANE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.pin,
  },
});
