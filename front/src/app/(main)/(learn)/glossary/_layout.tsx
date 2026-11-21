import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { GlossaryProvider } from '@/hooks/useGlossary';

// Browse -> Definition -> Definition ... is a stack, so the back button returns to the previous term.
export default function GlossaryLayout() {
  return (
    <GlossaryProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgCanvas } }} />
    </GlossaryProvider>
  );
}
