import type { ProductId } from '@/lib/bank/products';

/** Places in the bank tabs that a spotlight can point at: a product's button, or the loan calculator. */
export type SpotId = ProductId | 'loan-calculator';

/** What the spotlight says next to the place it points at. */
export type Spot = { id: SpotId; title: string; hint: string };

/** The spot's box in window coordinates. */
export type SpotRect = { x: number; y: number; width: number; height: number };
