import { fireEvent, screen } from 'expo-router/testing-library';

/** Walks a fresh onboarding from the welcome screen to "Let's see what you already know". Picks "Not sure yet" unless given area slugs. */
export async function walkSurvey(interests: string[] = []) {
  const tap = (id: string) => fireEvent.press(screen.getByTestId(id));
  await fireEvent.press(await screen.findByTestId('onboarding-start'));
  await tap('onboarding-next');
  await tap('onboarding-challenge-next');
  await tap('consent-accept');
  for (const id of interests.length ? interests.map((i) => `interest-${i}`) : ['interest-not-sure']) {
    await fireEvent.press(await screen.findByTestId(id));
  }
  await tap('onboarding-continue');
  await screen.findByTestId('onboarding-check-intro');
}
