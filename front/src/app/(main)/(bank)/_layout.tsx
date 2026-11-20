import { TopTabs } from 'expo-router/js-top-tabs';

import { colors } from '@/constants/theme';

/**
 * Bank tabs as a pager: tabs slide when you pick one in the nav, and a horizontal swipe moves to
 * the next or previous tab. Their bar is the shared FloatingNav drawn by the (main) layout.
 */
export default function BankLayout() {
  return (
    <TopTabs tabBar={() => null} screenOptions={{ swipeEnabled: true, sceneStyle: { backgroundColor: colors.bgCanvas } }}>
      <TopTabs.Screen name="index" options={{ title: 'Overview' }} />
      <TopTabs.Screen name="payments" options={{ title: 'Payments' }} />
      <TopTabs.Screen name="credits" options={{ title: 'Credits' }} />
      <TopTabs.Screen name="invest" options={{ title: 'Invest' }} />
    </TopTabs>
  );
}
