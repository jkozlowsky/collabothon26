import { fireEvent, screen } from 'expo-router/testing-library';

import type { Purpose } from '@/types/onboarding';
import type { ConfidenceRating, Horizon } from '@/types/quickCheck';

type Choices = { consent?: boolean; purpose?: Purpose; horizon?: Horizon; rating?: ConfidenceRating };

/** What a run without account access answers on its three extra questions. */
export const WITHOUT_ACCOUNT = { lifeStage: 'building', experience: 'regular', savingsCover: '3-6' } as const;

/** Walks a fresh onboarding from the welcome screen to "Let's see what you already know". */
export async function walkSurvey({ consent = true, purpose = 'home', horizon = '1-5y', rating = 2 }: Choices = {}) {
  const tap = (id: string) => fireEvent.press(screen.getByTestId(id));
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await tap('onboarding-next');
  await tap(consent ? 'consent-accept' : 'consent-decline');
  const picks = [
    ...(consent ? [] : Object.values(WITHOUT_ACCOUNT).map((value) => `option-${value}`)),
    `option-${purpose}`,
    `option-${horizon}`,
    `confidence-${rating}`,
  ];
  for (const pick of picks) {
    await tap(pick);
    await tap('onboarding-continue');
  }
  await screen.findByTestId('onboarding-check-intro');
}
