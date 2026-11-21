import { TopTabs } from 'expo-router/js-top-tabs';

import { colors } from '@/constants/theme';

/** Atlas tabs as a pager (slide + swipe, like the bank side). The bar is the shared FloatingNav. */
export default function LearnLayout() {
  return (
    <TopTabs tabBar={() => null} screenOptions={{ swipeEnabled: true, sceneStyle: { backgroundColor: colors.bgCanvas } }}>
      {/* No swipe on Map: a horizontal drag there turns the globe. */}
      <TopTabs.Screen name="map" options={{ title: 'Map', swipeEnabled: false }} />
      <TopTabs.Screen name="glossary" options={{ title: 'Glossary' }} />
      <TopTabs.Screen name="duel" options={{ title: 'Duel' }} />
      <TopTabs.Screen name="profile" options={{ title: 'Profile' }} />
    </TopTabs>
  );
}
