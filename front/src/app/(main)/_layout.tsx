import { Tabs } from 'expo-router/tabs';

import { FloatingNav } from '@/components/bank/FloatingNav';
import { colors } from '@/constants/theme';
import { useResumeLearnAfterOnboarding } from '@/hooks/useOpenLearn';

/**
 * The two sides of the app: the bank shell and the Atlas module. Both are tabs of one
 * navigator so each keeps its own tab and scroll position while you switch, and the one
 * FloatingNav stays mounted to morph between them.
 */
export default function MainLayout() {
  useResumeLearnAfterOnboarding();
  return (
    <Tabs
      tabBar={(props) => <FloatingNav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgCanvas } }}
    >
      <Tabs.Screen name="(bank)" />
      <Tabs.Screen name="(learn)" />
    </Tabs>
  );
}
