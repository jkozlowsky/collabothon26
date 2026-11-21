/**
 * The end of each story: a recap that encourages a first step, then what the (mock) bank offers in the
 * story's area. Everything depends only on the story's topic, never on the user's answers or numbers, and
 * the offers name facts, not a pick (MiFID II: information about products is fine, a personal
 * recommendation is not). The encouragement is to act at all, in the user's own time, never to buy one thing.
 */
import { PRODUCTS, type ProductId } from '@/lib/bank/products';
import type { BankOffer, PathOffers } from '@/types/offers';

/** An offer is a product's button in the bank. `from`: the lesson it connects to. `hint`: what the spotlight says. */
const product = (id: ProductId, from: string, hint: string): BankOffer => {
  const p = PRODUCTS[id];
  return { id, icon: p.icon, title: p.title, meta: p.meta, target: p.tab, spot: id, from, hint };
};

const PATHS: PathOffers[] = [
  {
    story: 'tokyo',
    city: 'Tokyo',
    title: 'Investing at the bank',
    headline: 'You know how to spread your money.',
    learned: [
      'Saving and investing do different jobs: lending (bonds) and owning (stocks) carry different risks.',
      'A bad first year is a fall on paper until you sell.',
      'One country is a small part of the world. Japan needed 34 years to get back to its 1989 peak.',
      'Small monthly amounts grow on themselves over many years.',
    ],
    nudge:
      'Knowing this is the hard part, and you have done it. The first step can be small: look at what is on offer, compare the costs, and decide in your own time. Starting with € 25 a month is still starting.',
    offers: [
      product('etf-plan', 'Mission 5 · Your monthly plan', 'Start a monthly plan into a fund or ETF you pick yourself. Amount and day are yours to set.'),
      product('buy-fund', 'Mission 4 · One country of many', 'Buy a fund or ETF once. The key information and the costs are shown before you order.'),
      product('instant-savings', 'Mission 1 · Lend it or own it', 'A separate account for the emergency fund, so it stays out of the depot.'),
      product('demo-depot', 'Mission 3 · The 34-year wait', 'Try orders with play money first and watch how prices move.'),
    ],
    target: 'invest',
    cta: 'Open Invest',
  },
  {
    story: 'seoul',
    city: 'Seoul',
    title: 'Trading tools at the bank',
    headline: 'You can spot hype before it spots you.',
    learned: [
      'After a 50% fall, a price needs +100% just to get back.',
      'Borrowed money makes a fall hit your own money harder, and the loan stays.',
      'Sure gains, secret tips and "buy now, all together" are red flags.',
      'A rule you set before the chat gets loud is the one you can keep.',
    ],
    nudge:
      'Many learn this the hard way; you learned it in five missions. Try it without risk first: practise with play money, set your own price lines, and only then decide whether real money joins in.',
    offers: [
      product('demo-depot', 'Mission 1 · When a price only goes up', 'Try orders with play money first and watch how prices move.'),
      product('price-alert', 'Mission 5 · Your own rule', 'Hear about a price at a line you set in advance, instead of from a chat.'),
      product('buy-fund', 'Mission 4 · One basket', 'Buy a fund or ETF once. The key information and the costs are shown before you order.'),
      product('etf-plan', 'Mission 2 · Borrowing to invest', 'Start a monthly plan into a fund or ETF you pick yourself. Amount and day are yours to set.'),
    ],
    target: 'invest',
    cta: 'Open Invest',
  },
  {
    story: 'berlin',
    city: 'Berlin',
    title: 'Saving at the bank',
    headline: 'You know where your savings can sit.',
    learned: [
      'When prices rise faster than the interest, safe money buys less every year.',
      'Saving first, on payday, makes it happen without willpower.',
      'Growth on growth: time does more of the work than the amount.',
      'An emergency fund is counted in months of costs and kept ready any day.',
      'Three pots: a safety net, goals, and money that can wait.',
    ],
    nudge:
      'Pick one small thing to do this week. Give your emergency fund its own place, or move a fixed amount every month. Small and regular beats big and once.',
    offers: [
      product('instant-savings', 'Mission 2 · Your safety net', 'Money for emergencies, available any day.'),
      product('fixed-term', 'Mission 1 · Safe money that shrinks', 'Money that can wait months or years, at a fixed rate. It is locked until the end of the term.'),
      product('standing-order', 'Mission 3 · Pay yourself first', 'Move a fixed amount into savings every month, without thinking about it.'),
      product('etf-plan', 'Mission 4 · Growth on growth', 'A monthly plan into a fund or ETF. Its value can go down as well as up.'),
    ],
    target: 'payments',
    cta: 'Open Payments',
  },
  {
    story: 'sao-paulo',
    city: 'São Paulo',
    title: 'Credit at the bank',
    headline: 'You can see the real price of credit.',
    learned: [
      '"0% instalments" can still cost money: ask for the cash price.',
      'Small instalments stack up until a big part of the pay is gone before it arrives.',
      'Paying only the minimum keeps most of a card bill growing.',
      'Compare loans by their total cost (APR), not by the monthly rate.',
    ],
    nudge:
      'Next time a loan or an instalment offer comes your way, you have the tools: work out the total cost, check what is left of your month, and feel free to say no when it does not fit.',
    offers: [
      {
        id: 'loan-calculator',
        icon: 'pie',
        title: 'Loan calculator',
        meta: 'Monthly payment and total cost',
        target: 'credits',
        spot: 'loan-calculator',
        from: 'Mission 4 · The real price of a loan',
        hint: 'See the monthly payment and the total cost of a loan before you apply.',
      },
      product('instalment-loan', 'Mission 2 · The stack', 'Apply with a fixed rate. The offer shows the APR and the total cost before you sign.'),
      product('card-full-repay', 'Mission 3 · The minimum payment', 'Have the whole card bill paid each month, so no card interest builds up.'),
      product('refinance', 'Mission 5 · Your own limit', 'Compare the total cost of a loan you have with new terms.'),
    ],
    target: 'credits',
    cta: 'Open Credits',
  },
  {
    story: 'buenos-aires',
    city: 'Buenos Aires',
    title: 'Keeping up with prices at the bank',
    headline: 'You can see how fast prices eat money.',
    learned: [
      'In Argentina, prices rose by more than 200% in 2023: 100 pesos bought a third as much by December.',
      'The rule of 72: divide 72 by the yearly price rise to see how many years until prices double.',
      'When interest is lower than the price rise, money buys a little less every year.',
      'The faster prices rise, the faster money that waits loses its buying power.',
    ],
    nudge:
      'You do not need to fear inflation to act on it. Take one look at where your money sits today and what it earns there, then compare that with how fast prices rise. Even a small change counts.',
    offers: [
      product(
        'instant-savings',
        'The rule of 72 · interest against prices',
        'Money here earns interest and is still ready any day. Compare its rate with the price rise.',
      ),
      product('fixed-term', 'When prices run away · a known rate', 'A rate fixed for the whole term, so you know in advance what the money earns.'),
      product('etf-plan', 'Your savings and prices · money that waits', 'For money that can wait for years. Its value can go down as well as up.'),
    ],
    target: 'home',
    cta: 'Open Overview',
  },
  {
    story: 'nairobi',
    city: 'Nairobi',
    title: 'Saving small at the bank',
    headline: 'You know small amounts add up.',
    learned: [
      '€ 5 a week is € 260 after one year.',
      'Pay yourself first: move money to savings on payday, then spend the rest.',
      'Saving then does not depend on how the month goes.',
      'A fixed monthly amount keeps growing, even without new decisions.',
    ],
    nudge:
      'The trick is to decide once. Choose an amount small enough that you will not miss it, and let it move on payday. You can raise it later, any time.',
    offers: [
      product('standing-order', 'Pay yourself first · on payday', 'Move a fixed amount into savings on the day your pay arrives.'),
      product('instant-savings', 'Small amounts add up · a place for them', 'Its own account for what you put aside, ready any day.'),
      product('etf-plan', 'Small amounts add up · over years', 'A monthly plan from € 25 into a fund or ETF. Its value can go down as well as up.'),
    ],
    target: 'payments',
    cta: 'Open Payments',
  },
  {
    story: 'mumbai',
    city: 'Mumbai',
    title: 'Gold and other money at the bank',
    headline: 'You know gold is not only glitter.',
    learned: [
      'Gold has kept its value over decades, but it pays no interest.',
      'Its price fell about 40% from 2011 to 2015 and needed until 2020 to get back.',
      'After a 40% fall, a price needs about +67% to get back to the start.',
      'Some people keep a small part in gold next to other money, not all of it.',
    ],
    nudge:
      'Before you add anything, look at where your money is today and how much of it sits in one place. Then decide what share of a big swing you could live with. Practise first if you like.',
    offers: [
      product('gold', 'Why gold glitters · no interest, big swings', 'Gold in the depot. It pays no interest, and its price can move a lot.'),
      product('buy-fund', 'Gold can fall for years · spreading money', 'The fund and ETF range, for money spread over many companies and countries.'),
      product('demo-depot', 'Gold can fall for years · try it first', 'Try orders with play money first and watch how prices move.'),
      product('price-alert', 'Gold can fall for years · your own line', 'Hear about a price at a line you set in advance.'),
    ],
    target: 'invest',
    cta: 'Open Invest',
  },
];

const byTitle = (a: BankOffer, b: BankOffer) => a.title.localeCompare(b.title);

/** The story's offers, sorted by name so the order is not a ranking. Null when the story has none. */
export function offersFor(story: string): PathOffers | null {
  const path = PATHS.find((p) => p.story === story);
  return path ? { ...path, offers: [...path.offers].sort(byTitle) } : null;
}

export const allPathOffers = () => PATHS;
