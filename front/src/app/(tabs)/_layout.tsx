import { Tabs } from 'expo-router/tabs';

import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="index" options={{ title: 'Learn' }} />
      <Tabs.Screen name="glossary" options={{ title: 'Glossary' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
