import { render, screen } from '@testing-library/react-native';

import { PinCallout } from '@/components/globe/PinCallout';
import { STORIES } from '@/lib/stories';

const berlin = STORIES.find((s) => s.id === 'berlin')!;

test('the Start here callout shows the badge above the city and the why line', async () => {
  await render(<PinCallout story={berlin} state="notStarted" onOpen={() => {}} startHere={{ why: 'Why here: Your answers about Saving' }} />);
  expect(screen.getByTestId('callout-start-here')).toHaveTextContent('Start here');
  expect(screen.getByTestId('callout-why-here')).toHaveTextContent('Why here: Your answers about Saving');
});

test('a callout without startHere has neither', async () => {
  await render(<PinCallout story={berlin} state="notStarted" onOpen={() => {}} />);
  expect(screen.queryByTestId('callout-start-here')).toBeNull();
  expect(screen.queryByTestId('callout-why-here')).toBeNull();
});
