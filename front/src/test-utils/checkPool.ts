import type { CheckQuestion } from '@/types/quickCheck';

/** The starter bank of docs/specs/F1b-quick-check.md as GET /api/check-questions returns it (with the correct option). */
export const POOL: CheckQuestion[] = [
  {
    id: 'emergency-cushion-purpose',
    area: 'saving',
    accountPrompt:
      'Your accounts show about €{monthOut} going out each month. If your income stopped for two months, what would an emergency fund be there to do?',
    slots: ['monthOut'],
    genericPrompt:
      'You spend about €1,500 a month. If your income stopped for two months, what would an emergency fund be there to do?',
    options: [
      'Cover your spending until income comes back, without borrowing',
      'Replace your income for good, so you no longer need to work',
      'Pay for planned purchases such as a holiday or a new phone',
      'Earn as high a return as possible while it waits for you',
    ],
    correctIndex: 0,
  },
  {
    id: 'inflation-real-value',
    area: 'saving',
    accountPrompt:
      'Your savings account holds €{savingsBalance} at {savingsInterestRate}% a year. Imagine prices rise by one percentage point more than that each year. Over a year, what happens to what that money can buy?',
    slots: ['savingsBalance', 'savingsInterestRate'],
    genericPrompt:
      'Your savings account holds €10,000 at 2% a year. Inflation runs at about 3%. Over a year, what happens to what that money can buy?',
    options: [
      'It buys a little more, because the balance grows by the interest',
      'It buys a little less, because prices rise faster than the interest',
      'It stays the same, because the money is safe in the bank',
      'It depends on the bank, not on prices',
    ],
    correctIndex: 1,
  },
  {
    id: 'inflation-grocery-bill',
    area: 'saving',
    accountPrompt:
      'Your accounts show about €{monthOut} going out each month. Over the next year prices rise by about 4% and you buy exactly the same things. What happens to your monthly spending?',
    slots: ['monthOut'],
    genericPrompt:
      'You spend about €1,500 a month. Over the next year prices rise by about 4% and you buy exactly the same things. What happens to your monthly spending?',
    options: [
      'It stays the same, because you buy the same things',
      'It rises, because the same things cost more',
      'It falls, because money is worth more when prices rise',
    ],
    correctIndex: 1,
  },
  {
    id: 'time-in-market',
    area: 'investing',
    accountPrompt:
      'You put about €{etfMonthly} a month into investments. Two people do the same at the same yearly return, but one starts 20 years earlier. Why does the early starter end up with far more?',
    slots: ['etfMonthly'],
    genericPrompt:
      'You put about €100 a month into investments. Two people do the same at the same yearly return, but one starts 20 years earlier. Why does the early starter end up with far more?',
    options: [
      'The early starter must have picked better investments along the way',
      'Compounding only works in the first ten years of any investment',
      'The early money has more years in which gains earn further gains',
    ],
    correctIndex: 2,
  },
  {
    id: 'short-term-fall',
    area: 'investing',
    accountPrompt:
      'Your investments are worth about €{depotTotal}. Imagine their value drops by 15% next month and you would not need the money for 20 years. What does that drop mean for the long run?',
    slots: ['depotTotal'],
    genericPrompt:
      'Your investments are worth about €10,000. Imagine their value drops by 15% next month and you would not need the money for 20 years. What does that drop mean for the long run?',
    options: [
      'Compounding is over, because one fall wipes out the growth of the years ahead',
      'The investment has failed, because a fall means it will not come back',
      'It is one month out of 20 years, and what is left keeps compounding',
    ],
    correctIndex: 2,
  },
  {
    id: 'compound-rate-vs-time',
    area: 'investing',
    accountPrompt: null,
    slots: [],
    genericPrompt:
      'Saver A earns 5% a year for 30 years. Saver B earns 6% a year for 20 years. Both start with the same amount and leave all gains in. Who ends up with more?',
    options: [
      'Saver B, because a higher yearly rate always beats more years',
      'Saver A, because ten more years of compounding outweigh one point',
      'It cannot be told without knowing the exact starting amount',
    ],
    correctIndex: 1,
  },
];
