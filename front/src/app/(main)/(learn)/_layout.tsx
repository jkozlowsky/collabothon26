import { Tabs } from 'expo-router/tabs';

import { colors } from '@/constants/theme';

/** Finance Quest tabs. Their bar is the shared FloatingNav drawn by the (main) layout. */
export default function LearnLayout() {
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgCanvas } }}>
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="glossary" options={{ title: 'Glossary' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
