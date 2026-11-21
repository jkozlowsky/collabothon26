import { readFileSync } from 'fs';
import { join } from 'path';

import { render } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { SpotlightOverlay } from '@/components/spotlight/SpotlightOverlay';
import { productsIn } from '@/lib/bank/products';
import { allPathOffers, offersFor } from '@/lib/offers';
import { appRoutes } from '@/test-utils/routes';

jest.mock('@/components/globe/GlobeScene', () => ({
  GlobeScene: () => {
    throw new Error('No WebGL in tests');
  },
}));

test('offers are facts, not a pick: no "for you", no "recommended", listed by name', () => {
  for (const path of allPathOffers()) {
    expect(JSON.stringify(path.offers)).not.toMatch(/for you|recommend|best|ideal/i);
    const titles = offersFor(path.story)!.offers.map((o) => o.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  }
});

const TAB_FILE = { home: 'index', payments: 'payments', credits: 'credits', invest: 'invest' } as const;

test('the encouragement pushes to act, never to one product', () => {
  for (const path of allPathOffers()) {
    for (const offer of path.offers) expect(path.nudge).not.toContain(offer.title);
    expect(path.nudge).not.toMatch(/you should|recommend|buy now/i);
  }
});

test('every offer points at a button that exists in its bank tab', () => {
  for (const offer of allPathOffers().flatMap((p) => p.offers)) {
    const source = readFileSync(join(__dirname, `../app/(main)/(bank)/${TAB_FILE[offer.target]}.tsx`), 'utf8');
    if (offer.spot === 'loan-calculator') expect(source).toContain('<SpotTarget id="loan-calculator"');
    else expect(productsIn(offer.target).map((p) => p.id)).toContain(offer.spot);
    if (offer.spot !== 'loan-calculator') expect(source).toContain(`<ProductSection title=`);
  }
});

test('the spotlight dims around the feature and closes from its note', async () => {
  const onClose = jest.fn();
  const view = await render(
    <SpotlightOverlay
      spot={{ id: 'etf-plan', title: 'Depot account', hint: 'Your depot.' }}
      rect={{ x: 20, y: 100, width: 350, height: 200 }}
      onClose={onClose}
    />,
  );
  // The overlay measures its own frame first (zero-sized in Jest), then draws the hole and the note.
  fireEvent(view.getByTestId('spotlight'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } } });
  expect(await view.findByText('Depot account')).toBeOnTheScreen();
  await fireEvent.press(view.getByTestId('spotlight-close'));
  await fireEvent.press(view.getByTestId('spotlight-ok'));
  expect(onClose).toHaveBeenCalledTimes(2);
});

beforeEach(() => {
  globalThis.fetch = jest.fn((url: string) => {
    const body = url.endsWith('/profile') ? { userId: 'demo-user', goals: [], onboardingCompleted: true } : [];
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  }) as jest.Mock;
});

test('end of a story: a check, the bank offers, then the Invest tab', async () => {
  await renderRouter(appRoutes, { initialUrl: '/offers/tokyo' });

  // Part 1: what the story taught and a push to act.
  expect(await screen.findByText('You know how to spread your money.')).toBeOnTheScreen();
  expect(screen.getByTestId('path-nudge')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('offers-continue'));

  // Part 2: the bank's products in this area, each tied to a lesson, with the line that it is not a recommendation.
  expect(screen.getByTestId('offer-etf-plan')).toBeOnTheScreen();
  expect(screen.getByText('Stop 5 · Your monthly plan')).toBeOnTheScreen();
  expect(screen.getByTestId('offers-disclaimer')).toHaveTextContent('not a recommendation', { exact: false });
  await fireEvent.press(screen.getByTestId('offers-open-bank'));

  expect(await screen.findByTestId('screen-invest')).toBeOnTheScreen();
});

test('picking an offer opens its bank tab', async () => {
  await renderRouter(appRoutes, { initialUrl: '/offers/sao-paulo' });
  await fireEvent.press(await screen.findByTestId('offers-continue'));
  await fireEvent.press(screen.getByTestId('offer-loan-calculator'));
  expect(await screen.findByTestId('screen-credits')).toBeOnTheScreen();
});

test('a bank product button opens its start sheet, which ends at a demo note', async () => {
  await renderRouter(appRoutes, { initialUrl: '/credits' });
  await fireEvent.press(await screen.findByTestId('product-instalment-loan'));
  expect(await screen.findByText('From 4.9%, depends on the check')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('product-start'));
  expect(await screen.findByText('Demo · the instalment loan application is not part of this prototype')).toBeOnTheScreen();
});
