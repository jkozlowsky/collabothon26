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
import { BankProvider } from '@/hooks/useBank';
import { OnboardingProvider, useOnboarding } from '@/hooks/useOnboarding';
import { ToastProvider } from '@/hooks/useToast';
import { TransferSheetProvider } from '@/hooks/useTransferSheet';

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
          <BankProvider>
            <ToastProvider>
              <TransferSheetProvider>
                <RootStack />
              </TransferSheetProvider>
            </ToastProvider>
          </BankProvider>
        </OnboardingProvider>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

/**
 * The app opens on the bank (host app shell). Finance Quest onboarding is opened from the Learn
 * button (useOpenLearn), never forced at launch, and closed by useResumeLearnAfterOnboarding.
 */
function RootStack() {
  const { done } = useOnboarding();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgCanvas },
      }}
    >
      <Stack.Screen name="(main)" options={{ animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Protected guard={done}>
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
