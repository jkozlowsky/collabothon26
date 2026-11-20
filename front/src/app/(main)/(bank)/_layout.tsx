import { Tabs } from 'expo-router/tabs';

import { colors } from '@/constants/theme';

/** Bank tabs. Their bar is the shared FloatingNav drawn by the (main) layout. */
export default function BankLayout() {
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgCanvas } }}>
      <Tabs.Screen name="index" options={{ title: 'Overview' }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments' }} />
      <Tabs.Screen name="credits" options={{ title: 'Credits' }} />
      <Tabs.Screen name="invest" options={{ title: 'Invest' }} />
    </Tabs>
  );
}
