import { render, screen } from '@testing-library/react-native';

import { StoryCard } from '@/components/StoryCard';
import { STORIES } from '@/lib/stories';

const berlin = STORIES.find((s) => s.id === 'berlin')!;

test('the Start here story card shows the badge and its why line', async () => {
  await render(<StoryCard story={berlin} state="default" onPress={() => {}} startHere={{ why: 'Why here: Your answers about Saving' }} />);
  expect(screen.getByTestId('story-card-start-here')).toHaveTextContent('Start here');
  expect(screen.getByTestId('story-card-why-here')).toHaveTextContent('Why here: Your answers about Saving');
});

test('a card without startHere has neither', async () => {
  await render(<StoryCard story={berlin} state="default" onPress={() => {}} />);
  expect(screen.queryByTestId('story-card-start-here')).toBeNull();
  expect(screen.queryByTestId('story-card-why-here')).toBeNull();
});
