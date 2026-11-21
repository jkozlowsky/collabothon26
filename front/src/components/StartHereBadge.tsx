import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/constants/theme';

/** The yellow "Start here" pill on the story card and the pin callout. */
export function StartHereBadge({ testID }: { testID: string }) {
  return (
    <View style={styles.badge} testID={testID}>
      <Text style={styles.text}>Start here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radii.pill, backgroundColor: colors.brandAccent },
  text: { ...type.overline, color: colors.textOnAccent },
});
