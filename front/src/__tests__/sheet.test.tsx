import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Sheet } from '@/components/bank/Sheet';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const sheet = (visible: boolean) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <Sheet visible={visible} onClose={() => {}} title="Detail">
      <Text>Body</Text>
    </Sheet>
  </SafeAreaProvider>
);

// Jest has no layout pass, which is the same state as a sheet closed in the moment between mounting and its first layout.
test('a sheet closed before its first layout unmounts instead of staying rendered off-screen', async () => {
  const { rerender } = await render(sheet(true));
  expect(screen.getByText('Detail')).toBeOnTheScreen();

  await rerender(sheet(false));
  expect(screen.queryByText('Detail')).toBeNull();
});
