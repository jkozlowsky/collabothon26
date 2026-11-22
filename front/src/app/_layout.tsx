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

import { AccountPicker } from '@/components/accounts/AccountPicker';
import { colors, elevation, fonts } from '@/constants/theme';
import { AccountProvider } from '@/hooks/useAccount';
import { BankProvider } from '@/hooks/useBank';
import { OnboardingProvider, useOnboarding } from '@/hooks/useOnboarding';
import { SpotlightProvider } from '@/hooks/useSpotlight';
import { ToastProvider } from '@/hooks/useToast';
import { TransferSheetProvider } from '@/hooks/useTransferSheet';
import { personaFor } from '@/lib/personas';
import { CurrentUserProvider, useCurrentUser } from '@/lib/user';

/** Widest "phone" on web; on a wide desktop window the app is centered at this width. */
const WEB_PHONE_WIDTH = 430;

/** The native header of the story and lesson screens: a back arrow on the canvas colour, no title, no shadow. */
const BARE_HEADER = {
  headerShown: true,
  title: '',
  headerShadowVisible: false,
  headerTintColor: colors.brandPrimary,
  headerStyle: { backgroundColor: colors.bgCanvas },
};

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
        <CurrentUserProvider>
          <RootContent />
        </CurrentUserProvider>
      </View>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

function RootContent() {
  const { userId, isLoggedIn, isReady } = useCurrentUser();

  if (!isReady) return null;

  if (!isLoggedIn || !userId) {
    return <AccountPicker />;
  }

  const persona = personaFor(userId);

  return (
    // Keyed by user: switching accounts remounts every provider below, so none keeps the previous user's state.
    <OnboardingProvider key={userId}>
      <AccountProvider>
        <BankProvider seed={persona.bankSeed}>
          <ToastProvider>
            <TransferSheetProvider>
              <SpotlightProvider>
                <RootStack />
              </SpotlightProvider>
            </TransferSheetProvider>
          </ToastProvider>
        </BankProvider>
      </AccountProvider>
    </OnboardingProvider>
  );
}

/**
 * The app opens on the bank (host app shell). Atlas onboarding is opened from the Learn
 * button (useOpenLearn), never forced at launch, and closed by leaveOnboardingForCheck.
 */
function RootStack() {
  const { done, loaded } = useOnboarding();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgCanvas },
      }}
    >
      <Stack.Screen name="(main)" options={{ animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'slide_from_bottom' }} />
      {/* Until the profile has loaded, a reload of /learning-path must not bounce to the bank. */}
      <Stack.Protected guard={done || !loaded}>
        {/* A fresh onboarding continues here; leaveOnboardingForCheck opens it. */}
        <Stack.Screen name="categorizing" options={{ animation: 'fade' }} />
        <Stack.Screen name="learning-path" options={{ animation: 'fade' }} />
        <Stack.Screen name="story/[id]" options={BARE_HEADER} />
        <Stack.Screen
          name="lesson/[id]"
          options={{ ...BARE_HEADER, headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.textPrimary } }}
        />
        <Stack.Screen name="offers/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
      {/* Full-screen duel flow over the tabs. Not behind the onboarding guard, so a reload mid-match can resume. */}
      <Stack.Screen name="duel/match" />
      <Stack.Screen name="duel/rankings" />
      <Stack.Screen name="duel/history" />
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
