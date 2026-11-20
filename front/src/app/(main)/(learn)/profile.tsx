import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function ProfileScreen() {
  const { reset } = useOnboarding();
  return (
    <Screen title="Profile" testID="screen-profile">
      <View style={{ flex: 1 }} />
      {/* Demo helper: clears the saved onboarding answers; back in the bank, the next Learn tap shows the flow again. */}
      <Button
        label="Restart onboarding"
        onPress={() => {
          reset();
          router.navigate('/');
        }}
        testID="restart-onboarding"
      />
    </Screen>
  );
}
