import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

const FADE = 16;

/** A short fade under the header, so a zoomed-in globe passing under it has no hard edge. */
export function HeaderFade() {
  return (
    <View style={styles.fade} pointerEvents="none">
      <Svg width="100%" height={FADE}>
        <Defs>
          <LinearGradient id="header-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brandPrimarySoft} />
            <Stop offset="1" stopColor={colors.brandPrimarySoft} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={FADE} fill="url(#header-fade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: -FADE, height: FADE },
});
