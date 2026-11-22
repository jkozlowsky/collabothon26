/** Euro formatting for the bank shell. Hand-rolled so web, Android and Jest all print the same string. */

const MINUS = '−';
const MASK = '€ ••••';

type FormatOptions = {
  /** Prefix positive amounts with "+" (incoming money). Negative amounts always get "−". */
  signed?: boolean;
  /** Replace the number with dots (balance hidden). */
  hidden?: boolean;
  /** Drop the cents, e.g. "€ 3,000" in meta lines. */
  whole?: boolean;
};

/** "−" for a negative value; "+" for a positive one when `signed`. */
function signOf(value: number, signed: boolean): string {
  if (value < 0) return MINUS;
  return signed && value > 0 ? '+' : '';
}

export function groupThousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 428052 → "€ 4,280.52"; −4218 → "−€ 42.18"; with `signed`, 215000 → "+€ 2,150.00". */
export function formatEUR(cents: number, { signed = false, hidden = false, whole = false }: FormatOptions = {}): string {
  const sign = signOf(cents, signed);
  if (hidden) return `${sign}${MASK}`;
  const abs = Math.abs(Math.round(cents));
  const euros = groupThousands(Math.floor(abs / 100));
  const body = whole ? euros : `${euros}.${String(abs % 100).padStart(2, '0')}`;
  return `${sign}€ ${body}`;
}

/** "+3.2%" / "−2.3%" / "0.0%". */
export function formatPercent(value: number, { signed = true }: { signed?: boolean } = {}): string {
  return `${signOf(value, signed)}${Math.abs(value).toFixed(1)}%`;
}

/**
 * Parses what the user typed on the amount keypad ("25", "25.5", "1,280.40") into cents.
 * Returns null for anything that is not a plain positive-or-zero amount with at most 2 decimals.
 */
export function parseAmount(input: string): number | null {
  const s = input.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [euros, cents = ''] = s.split('.');
  return Number(euros) * 100 + Number(cents.padEnd(2, '0'));
}

/** Removes spaces and upper-cases, so "de89 3704…" and "DE893704…" compare equal. */
export function normaliseIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

/** Demo check only: German IBAN shape (DE + 20 digits). No checksum. */
export function isValidIban(iban: string): boolean {
  return /^DE\d{20}$/.test(normaliseIban(iban));
}

/** "DE89370400440532014821" → "DE89 3704 0044 0532 0148 21". */
export function groupIban(iban: string): string {
  return normaliseIban(iban).replace(/(.{4})(?=.)/g, '$1 ');
}

/** "DE89 3704 •••• •••• 4821": first 8 and last 4 characters visible. */
export function maskIban(iban: string): string {
  const n = normaliseIban(iban);
  return `${n.slice(0, 4)} ${n.slice(4, 8)} •••• •••• ${n.slice(-4)}`;
}
