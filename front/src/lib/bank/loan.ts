/** Annuity loan maths for the loan calculator: equal monthly instalments, interest on the remaining balance. */

export type LoanQuote = { monthly: number; totalInterest: number; totalRepaid: number };

/**
 * @param principal amount borrowed, in cents
 * @param months number of monthly instalments
 * @param aprPercent yearly rate in percent (treated as nominal yearly rate / 12 per month)
 */
export function loanQuote(principal: number, months: number, aprPercent: number): LoanQuote {
  const r = aprPercent / 100 / 12;
  const monthly = r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months);
  const rounded = Math.round(monthly);
  const totalRepaid = rounded * months;
  return { monthly: rounded, totalInterest: totalRepaid - principal, totalRepaid };
}
