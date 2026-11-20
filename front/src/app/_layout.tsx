import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { OnboardingProvider, useOnboarding } from '@/hooks/useOnboarding';

/** Widest "phone" on web; on a wide desktop window the app is centered at this width. */
const WEB_PHONE_WIDTH = 430;

export default function RootLayout() {
  return (
    <View style={styles.page}>
      <View style={styles.phone}>
        <OnboardingProvider>
          <RootStack />
        </OnboardingProvider>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

/** Until onboarding is done only /onboarding is reachable; afterwards it is gone. */
function RootStack() {
  const { loaded, done } = useOnboarding();
  // Wait for the saved profile so a returning user never sees onboarding flash by.
  if (!loaded) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!done}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={done}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="lesson/[id]"
          options={{
            headerShown: true,
            title: '',
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </Stack.Protected>
    </Stack>
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
