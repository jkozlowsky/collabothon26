import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';

import { colors, elevation, fonts } from '@/constants/theme';
import { OnboardingProvider, useOnboarding } from '@/hooks/useOnboarding';

/** Widest "phone" on web; on a wide desktop window the app is centered at this width. */
const WEB_PHONE_WIDTH = 430;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // A failed font load falls back to the system font rather than blocking the app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={styles.page}>
      <View style={styles.phone}>
        <OnboardingProvider>
          <RootStack />
        </OnboardingProvider>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

/** Until onboarding is done only /onboarding is reachable; afterwards it is gone. */
function RootStack() {
  const { loaded, done } = useOnboarding();
  // Wait for the saved profile so a returning user never sees onboarding flash by.
  if (!loaded) return null;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgCanvas },
      }}
    >
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
            headerTintColor: colors.brandPrimary,
            headerStyle: { backgroundColor: colors.bgCanvas },
            headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.textPrimary },
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? colors.bgTint : colors.bgCanvas,
  },
  phone: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: WEB_PHONE_WIDTH,
      alignSelf: 'center',
      backgroundColor: colors.bgCanvas,
      ...elevation.mid,
    }),
  },
});
