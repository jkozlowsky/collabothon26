import { fireEvent, screen } from 'expo-router/testing-library';

import type { Purpose } from '@/types/onboarding';
import type { Horizon } from '@/types/quickCheck';

type Choices = { purpose?: Purpose; horizon?: Horizon };

/** Walks a fresh onboarding from the welcome screen to "Let's see what you already know". */
export async function walkSurvey({ purpose = 'home', horizon = '1-5y' }: Choices = {}) {
  const tap = (id: string) => fireEvent.press(screen.getByTestId(id));
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await tap('onboarding-next');
  await tap('onboarding-challenge-next');
  await tap('consent-accept');
  for (const pick of [`option-${purpose}`, `option-${horizon}`]) {
    await tap(pick);
    await tap('onboarding-continue');
  }
  await screen.findByTestId('onboarding-check-intro');
}
