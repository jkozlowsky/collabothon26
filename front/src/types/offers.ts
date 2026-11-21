import type { ProductTab } from '@/lib/bank/products';
import type { BankIconName } from '@/types/bank';
import type { SpotId } from '@/types/spotlight';

/** The bank tab an offer lives in. */
export type OfferTarget = ProductTab;

/** One product or service of the bank, described by facts only: no ranking, no "for you". */
export type BankOffer = {
  id: string;
  icon: BankIconName;
  title: string;
  /** Plain facts: "From € 25 a month · pause any time". */
  meta: string;
  target: OfferTarget;
  /** The lesson it connects to: "Stop 3 · Money for emergencies". */
  from: string;
  /** The feature in that tab the spotlight points at, and what it says there. */
  spot: SpotId;
  hint: string;
};

/** The end of a story: a recap that encourages a first step, then what the bank offers in the story's area. */
export type PathOffers = {
  story: string;
  city: string;
  /** "Investing at the bank" */
  title: string;
  /** The recap's title: "You know how to spread your money." */
  headline: string;
  /** What the story taught, one line per idea. */
  learned: string[];
  /** Encourages a first step in the user's own time; never names a product. */
  nudge: string;
  /** Listed by name, so the order says nothing about which one fits whom. */
  offers: BankOffer[];
  /** The tab the last button opens. */
  target: OfferTarget;
  /** The last button: "Open Invest". */
  cta: string;
};
