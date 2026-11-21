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
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors, elevation, fonts } from '@/constants/theme';
import { AccountProvider } from '@/hooks/useAccount';
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
    // Gesture Handler needs a root view for the globe and story sheet gestures.
    <GestureHandlerRootView style={styles.page}>
      <View style={styles.phone}>
        <OnboardingProvider>
          <AccountProvider>
          <BankProvider>
            <ToastProvider>
              <TransferSheetProvider>
                <RootStack />
              </TransferSheetProvider>
            </ToastProvider>
          </BankProvider>
          </AccountProvider>
        </OnboardingProvider>
      </View>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
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
          name="story/[id]"
          options={{
            headerShown: true,
            title: '',
            headerShadowVisible: false,
            headerTintColor: colors.brandPrimary,
            headerStyle: { backgroundColor: colors.bgCanvas },
          }}
        />
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
      {/* Full-screen duel flow over the tabs. Not behind the onboarding guard, so a reload mid-match can resume. */}
      <Stack.Screen name="duel/match" />
      <Stack.Screen name="duel/rankings" />
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
