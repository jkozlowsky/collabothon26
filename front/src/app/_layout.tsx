import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

/** Widest "phone" on web; on a wide desktop window the app is centered at this width. */
const WEB_PHONE_WIDTH = 430;

export default function RootLayout() {
  return (
    <View style={styles.page}>
      <View style={styles.phone}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="lesson/[id]"
            options={{
              headerShown: true,
              title: '',
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </Stack>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? colors.border : colors.background,
  },
  phone: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: WEB_PHONE_WIDTH,
      alignSelf: 'center',
      backgroundColor: colors.background,
      boxShadow: '0 0 24px rgba(0, 0, 0, 0.08)',
    }),
  },
});
