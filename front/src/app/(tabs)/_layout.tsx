import { Tabs } from 'expo-router/tabs';

import { colors, fonts } from '@/constants/theme';

// Themed stock tab bar; the Figma "Floating Nav" (glass pill) replaces it in a later step.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgSurface, borderTopColor: colors.borderDefault },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bgCanvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Learn' }} />
      <Tabs.Screen name="glossary" options={{ title: 'Glossary' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
