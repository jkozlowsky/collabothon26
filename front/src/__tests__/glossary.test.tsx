import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';

const categories = [
  {
    slug: 'basics',
    name: 'Basics',
    terms: [
      { slug: 'inflation', name: 'Inflation', shortDescription: 'Prices rising over time' },
      { slug: 'budget', name: 'Budget', shortDescription: 'A plan for money' },
    ],
  },
  {
    slug: 'investing',
    name: 'Investing',
    terms: [{ slug: 'etf', name: 'ETF', shortDescription: 'A basket of investments' }],
  },
];

const details: Record<string, unknown> = {
  inflation: {
    slug: 'inflation',
    name: 'Inflation',
    fullName: null,
    category: { slug: 'basics', name: 'Basics' },
    definitionStandard: 'Prices rise. Often tied to the [[etf|ETF]] story.',
    example: 'A coffee gets pricier.',
    graphicKey: null,
    related: [{ slug: 'budget', name: 'Budget' }],
  },
  etf: {
    slug: 'etf',
    name: 'ETF',
    fullName: 'Exchange-traded fund',
    category: { slug: 'investing', name: 'Investing' },
    definitionStandard: 'A basket of investments.',
    example: null,
    graphicKey: null,
    related: [],
  },
};

beforeEach(() => {
  globalThis.fetch = jest.fn((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve(
          url.endsWith('/profile')
            ? { userId: 'demo-user', interests: [], onboardingCompleted: true }
            : url.endsWith('/api/glossary')
              ? categories
              : (details[url.split('/terms/')[1]] ?? []),
        ),
    }),
  ) as jest.Mock;
});

async function openGlossary() {
  await renderRouter(appRoutes, { initialUrl: '/glossary' });
}

test('opens with the first category expanded and the rest collapsed', async () => {
  await openGlossary();
  expect(await screen.findByTestId('term-inflation')).toBeOnTheScreen();
  expect(screen.queryByTestId('term-etf')).not.toBeOnTheScreen();
});

test('a category header collapses and expands its terms', async () => {
  await openGlossary();
  await screen.findByTestId('term-inflation');

  await fireEvent.press(screen.getByTestId('category-basics'));
  // The terms leave the tree when the closing animation is over.
  await waitFor(() => expect(screen.queryByTestId('term-inflation')).not.toBeOnTheScreen());

  await fireEvent.press(screen.getByTestId('category-investing'));
  expect(screen.getByTestId('term-etf')).toBeOnTheScreen();
});

test('the list shows names only: no per-term descriptions, the category icon is on the header', async () => {
  await openGlossary();
  await screen.findByTestId('term-inflation');
  expect(screen.queryByText('Prices rising over time')).not.toBeOnTheScreen();
  expect(screen.queryByText('Learn the language of money')).not.toBeOnTheScreen();
  expect(screen.queryByTestId('category-chips')).not.toBeOnTheScreen();
});

test('switching to Saved and back keeps what was open in All', async () => {
  await openGlossary();
  await screen.findByTestId('term-inflation');
  // All: Basics open (default), Investing closed. Open Investing too.
  await fireEvent.press(screen.getByTestId('category-investing'));
  expect(screen.getByTestId('term-etf')).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('saved-toggle'));
  expect(screen.getByRole('header', { name: 'Saved terms' })).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('saved-toggle'));
  expect(screen.getByRole('header', { name: 'Glossary' })).toBeOnTheScreen();
  expect(screen.getByTestId('term-inflation')).toBeOnTheScreen();
  expect(screen.getByTestId('term-etf')).toBeOnTheScreen();
});

test('tapping a term opens its definition, a link opens the next term, back returns', async () => {
  await openGlossary();
  await fireEvent.press(await screen.findByTestId('term-inflation'));

  expect(await screen.findByTestId('definition-title')).toHaveTextContent('Inflation');
  expect(screen.getByTestId('definition-example')).toBeOnTheScreen();
  expect(screen.getByTestId('related-budget')).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId('definition-link-etf'));
  await screen.findByText('Exchange-traded fund');
  expect(screen.getByTestId('definition-title')).toHaveTextContent('ETF');
  // Breadcrumb shows where we came from: Glossary > Inflation > ETF.
  expect(screen.getByTestId('breadcrumb')).toHaveProp('accessibilityLabel', 'Path: Glossary, Inflation, ETF');

  await fireEvent.press(screen.getByTestId('definition-back'));
  expect(await screen.findByTestId('definition-title')).toHaveTextContent('Inflation');
});

test('tapping an earlier breadcrumb step goes back to that term', async () => {
  await openGlossary();
  await fireEvent.press(await screen.findByTestId('term-inflation'));
  await fireEvent.press(await screen.findByTestId('definition-link-etf'));
  await screen.findByText('Exchange-traded fund');

  await fireEvent.press(screen.getByLabelText('Inflation', { exact: true }));
  expect(await screen.findByTestId('definition-title')).toHaveTextContent('Inflation');
});
