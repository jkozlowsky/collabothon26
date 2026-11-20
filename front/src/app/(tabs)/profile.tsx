import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function ProfileScreen() {
  const { reset } = useOnboarding();
  return (
    <Screen title="Profile" testID="screen-profile">
      <View style={{ flex: 1 }} />
      {/* Demo helper: clears the saved onboarding answers so the flow can be shown again. */}
      <Button label="Restart onboarding" onPress={reset} testID="restart-onboarding" />
    </Screen>
  );
}
