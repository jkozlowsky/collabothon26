import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { appRoutes } from '@/test-utils/routes';
import { defaultLanguageLevel } from '@/hooks/useGlossary';
import type { LanguageLevel, SearchResponse } from '@/types/glossary';

const categories = [
  {
    slug: 'basics',
    name: 'Basics',
    terms: [{ slug: 'inflation', name: 'Inflation', shortDescription: 'Prices rising over time' }],
  },
  {
    slug: 'investing',
    name: 'Investing',
    terms: [
      { slug: 'etf', name: 'ETF', shortDescription: 'A basket of investments' },
      { slug: 'dividend', name: 'Dividend', shortDescription: 'A slice of profit' },
    ],
  },
];

function detail(slug: string, extra: Record<string, unknown> = {}) {
  return {
    slug,
    name: slug,
    fullName: null,
    category: { slug: 'basics', name: 'Basics' },
    definitionStandard: `Standard text of ${slug}.`,
    definitionPlain: null,
    example: null,
    graphicKey: null,
    related: [],
    lesson: null,
    ...extra,
  };
}

const details: Record<string, unknown> = {
  inflation: detail('inflation', { definitionPlain: 'Plain words about prices.' }),
  etf: detail('etf'),
  dividend: detail('dividend'),
  growth: detail('growth', { graphicKey: 'compound-growth' }),
  mystery: detail('mystery', { graphicKey: 'no-such-graphic' }),
};

const hit = (slug: string, name: string) => ({
  slug,
  name,
  category: { slug: 'investing', name: 'Investing' },
  shortDescription: `About ${name}`,
});
const empty: SearchResponse = { terms: [], mentions: [], suggestions: [] };
const searches: Record<string, SearchResponse> = {
  div: {
    terms: [hit('dividend', 'Dividend')],
    mentions: [{ slug: 'etf', name: 'ETF', snippet: '…some ETFs pay out a dividend…' }],
    suggestions: [],
  },
  divdend: { terms: [], mentions: [], suggestions: [hit('dividend', 'Dividend')] },
};

type Calls = { url: string; method: string; body?: string }[];
let calls: Calls;

function mockApi(opts: { favorites?: string[]; level?: LanguageLevel | null; failFavoriteSave?: boolean } = {}) {
  calls = [];
  const respond = (body: unknown, status = 200) =>
    Promise.resolve({ ok: status < 400, status, statusText: '', json: () => Promise.resolve(body) });
  globalThis.fetch = jest.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.endsWith('/profile')) return respond({ userId: 'demo-user', goals: [], onboardingCompleted: true });
    if (url.endsWith('/api/glossary')) return respond(categories);
    if (url.includes('/glossary/favorites/')) return opts.failFavoriteSave ? respond(null, 500) : respond(null, 204);
    if (url.endsWith('/glossary/favorites')) return respond(opts.favorites ?? []);
    if (url.endsWith('/glossary/preference')) {
      return method === 'PUT' ? respond(JSON.parse(init?.body as string)) : respond({ languageLevel: opts.level ?? null });
    }
    if (url.includes('/api/glossary/search?q=')) return respond(searches[decodeURIComponent(url.split('q=')[1])] ?? empty);
    if (url.includes('/api/glossary/terms/')) return respond(details[url.split('/terms/')[1]]);
    return respond([]);
  }) as jest.Mock;
}

async function openGlossary(initialUrl = '/glossary') {
  await renderRouter(appRoutes, { initialUrl });
}

describe('search', () => {
  test('shows matching terms and mentions instead of the category list, and opens a result', async () => {
    mockApi();
    await openGlossary();
    await fireEvent.changeText(await screen.findByTestId('search-input'), 'div');

    expect(await screen.findByTestId('result-dividend')).toBeOnTheScreen();
    expect(screen.getByTestId('mention-etf')).toBeOnTheScreen();
    expect(screen.getByText(/1 term matches/)).toBeOnTheScreen();
    expect(screen.queryByTestId('category-basics')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('result-dividend'));
    expect(await screen.findByTestId('definition-title')).toHaveTextContent('dividend');
  });

  test('a typo shows "Did you mean", and a category chip leads back to browsing', async () => {
    mockApi();
    await openGlossary();
    await fireEvent.changeText(await screen.findByTestId('search-input'), 'divdend');

    expect(await screen.findByTestId('search-empty')).toBeOnTheScreen();
    expect(screen.getByText('Did you mean')).toBeOnTheScreen();
    expect(screen.getByTestId('result-dividend')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('browse-investing'));
    expect(screen.queryByTestId('search-empty')).not.toBeOnTheScreen();
    expect(screen.getByTestId('search-input').props.value).toBe('');
    expect(screen.getByTestId('term-etf')).toBeOnTheScreen();
  });

  test('the clear button empties the field and brings the category list back', async () => {
    mockApi();
    await openGlossary();
    await fireEvent.changeText(await screen.findByTestId('search-input'), 'div');
    await screen.findByTestId('result-dividend');

    await fireEvent.press(screen.getByTestId('search-clear'));
    expect(screen.queryByTestId('search-results')).not.toBeOnTheScreen();
    expect(screen.getByTestId('category-basics')).toBeOnTheScreen();
  });
});

describe('favourites', () => {
  test('the Saved button in the header shows the count and filters the list', async () => {
    mockApi({ favorites: ['etf'] });
    await openGlossary();
    await screen.findByTestId('term-inflation');

    await fireEvent.press(await screen.findByText('Saved · 1'));
    expect(screen.getByTestId('term-etf')).toBeOnTheScreen();
    expect(screen.queryByTestId('term-inflation')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('term-dividend')).not.toBeOnTheScreen();
  });

  test('the star in a list row shows and changes whether the term is saved', async () => {
    mockApi({ favorites: ['etf'] });
    await openGlossary();
    await screen.findByTestId('term-inflation');

    expect(screen.getByLabelText('Save Inflation')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('save-inflation'));
    expect(screen.getByLabelText('Remove Inflation from saved')).toBeOnTheScreen();
    expect(screen.getByText('Saved · 2')).toBeOnTheScreen();
    expect(calls).toContainEqual(expect.objectContaining({ method: 'PUT', url: expect.stringMatching(/favorites\/inflation$/) }));

    // Tapping the star does not open the definition.
    expect(screen.queryByTestId('screen-definition')).not.toBeOnTheScreen();
  });

  test('the Saved view explains itself when nothing is saved', async () => {
    mockApi();
    await openGlossary();
    await fireEvent.press(await screen.findByTestId('saved-toggle'));
    expect(screen.getByTestId('saved-empty')).toBeOnTheScreen();
  });

  test('the star saves a term at once and sends it to the backend', async () => {
    mockApi();
    await openGlossary('/glossary/inflation');
    await fireEvent.press(await screen.findByLabelText('Save term'));

    expect(screen.getByLabelText('Remove from saved')).toBeOnTheScreen();
    expect(calls).toContainEqual(expect.objectContaining({ method: 'PUT', url: expect.stringMatching(/favorites\/inflation$/) }));

    await fireEvent.press(screen.getByLabelText('Remove from saved'));
    expect(screen.getByLabelText('Save term')).toBeOnTheScreen();
    expect(calls).toContainEqual(expect.objectContaining({ method: 'DELETE', url: expect.stringMatching(/favorites\/inflation$/) }));
  });

  test('a failed save puts the star back and tells the user', async () => {
    mockApi({ failFavoriteSave: true });
    await openGlossary('/glossary/inflation');
    await fireEvent.press(await screen.findByLabelText('Save term'));

    expect(await screen.findByText(/Could not update your saved terms/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Save term')).toBeOnTheScreen();
  });
});

describe('language level', () => {
  test('starts in plain words, switches to standard and remembers the choice on the backend', async () => {
    mockApi();
    await openGlossary('/glossary/inflation');
    expect(await screen.findByTestId('definition-text')).toHaveTextContent('Plain words about prices.');

    await fireEvent.press(screen.getByTestId('level-standard'));
    expect(screen.getByTestId('definition-text')).toHaveTextContent('Standard text of inflation.');
    expect(calls).toContainEqual(
      expect.objectContaining({ method: 'PUT', url: expect.stringMatching(/preference$/), body: '{"languageLevel":"standard"}' }),
    );
  });

  test('a saved choice wins over the default', async () => {
    mockApi({ level: 'standard' });
    await openGlossary('/glossary/inflation');
    await screen.findByTestId('definition-title');
    expect(await screen.findByText('Standard text of inflation.')).toBeOnTheScreen();
  });

  test('a term without a plain version shows the standard text and says so', async () => {
    mockApi();
    await openGlossary('/glossary/etf');
    expect(await screen.findByTestId('plain-missing')).toBeOnTheScreen();
    expect(screen.getByTestId('definition-text')).toHaveTextContent('Standard text of etf.');
  });

  test('the default depends on experience: beginners plain, experienced standard', () => {
    expect(defaultLanguageLevel(undefined)).toBe('plain');
    expect(defaultLanguageLevel('none')).toBe('plain');
    expect(defaultLanguageLevel('tried')).toBe('plain');
    expect(defaultLanguageLevel('regular')).toBe('standard');
    expect(defaultLanguageLevel('experienced')).toBe('standard');
  });
});

describe('graphics', () => {
  test('draws the graphic named by the term', async () => {
    mockApi();
    await openGlossary('/glossary/growth');
    expect(await screen.findByTestId('graphic-compound-growth')).toBeOnTheScreen();
  });

  test('an unknown graphic key draws nothing and the definition still shows', async () => {
    mockApi();
    await openGlossary('/glossary/mystery');
    expect(await screen.findByTestId('definition-title')).toBeOnTheScreen();
    expect(screen.queryByTestId(/^graphic-/)).not.toBeOnTheScreen();
  });
});
