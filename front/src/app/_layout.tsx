import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
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
      <StatusBar style="auto" />
    </>
  );
}
