import type { CheckQuestion } from '@/types/quickCheck';

/** The starter pool of docs/specs/F1b-quick-check.md, as GET /api/check-questions returns it. */
export const POOL: CheckQuestion[] = [
  {
    id: 'savings-runway',
    category: 'finance',
    area: 'saving',
    lessonId: 1,
    accountPrompt:
      'You keep €{savingsBalance} in savings and spend about €{monthOut} a month. If your income stopped tomorrow, how long would your money last?',
    slots: ['savingsBalance', 'monthOut'],
    genericPrompt:
      'Imagine you keep €5,000 in savings and spend €1,500 a month. If your income stopped tomorrow, how long would your money last, and how did you work it out?',
  },
  {
    id: 'rate-vs-inflation',
    category: 'finance',
    area: 'saving',
    lessonId: 3,
    accountPrompt:
      'Your savings account pays {savingsInterestRate}% a year. If prices rise 3% a year, what happens to what your €{savingsBalance} can buy?',
    slots: ['savingsInterestRate', 'savingsBalance'],
    genericPrompt: 'A savings account pays 2% a year while prices rise 3% a year. What happens to what €5,000 can buy?',
  },
  {
    id: 'loan-apr',
    category: 'finance',
    area: 'debt',
    lessonId: null,
    accountPrompt: 'Your instalment loan has €{loanRemaining} left at {loanApr}% APR. What does that APR tell you about the loan?',
    slots: ['loanRemaining', 'loanApr'],
    genericPrompt: 'A loan of €8,000 has a 6% APR. What does the APR tell you about the loan?',
  },
  {
    id: 'card-minimum',
    category: 'finance',
    area: 'debt',
    lessonId: null,
    accountPrompt:
      'You have used €{cardUsed} of your €{cardLimit} credit card limit. What happens if you pay only the minimum each month?',
    slots: ['cardUsed', 'cardLimit'],
    genericPrompt: 'You owe €1,000 on a credit card. What happens if you pay only the minimum each month?',
  },
  {
    id: 'etf-drop',
    category: 'investing',
    area: 'investing',
    lessonId: null,
    accountPrompt:
      'Every month €{etfMonthly} goes into your monthly ETF plan. If the market falls 20% next month, what happens to that money?',
    slots: ['etfMonthly'],
    genericPrompt: 'Every month €100 goes into a world ETF. If the market falls 20% next month, what happens to that money?',
  },
  {
    id: 'time-in-market',
    category: 'investing',
    area: 'investing',
    lessonId: 2,
    accountPrompt: 'Your depot holds €{depotTotal}. Why does how long you stay invested matter?',
    slots: ['depotTotal'],
    genericPrompt: 'You invest €1,000. Why does how long you stay invested matter?',
  },
  {
    id: 'one-etf-vs-one-stock',
    category: 'investing',
    area: 'risk',
    lessonId: null,
    accountPrompt:
      'Your depot has {positionCount} positions. How does spreading money over many companies change risk compared with putting it all in one company?',
    slots: ['positionCount'],
    genericPrompt: 'How does spreading money over many companies change risk compared with putting it all in one company?',
  },
  {
    id: 'too-good-offer',
    category: 'investing',
    area: 'risk',
    lessonId: null,
    accountPrompt: null,
    slots: [],
    genericPrompt: 'Someone online promises 20% a month with no risk. What tells you something is wrong?',
  },
  {
    id: 'pension-gap',
    category: 'investing',
    area: 'retirement',
    lessonId: null,
    accountPrompt: null,
    slots: [],
    genericPrompt: 'Why might your state pension alone not cover what you spend today?',
  },
];
