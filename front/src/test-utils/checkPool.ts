import type { CheckQuestion } from '@/types/quickCheck';

/** Six quiz steps of the lessons, as GET /api/check-questions returns them (docs/specs/F1b-quick-check.md, v5). */
export const POOL: CheckQuestion[] = [
  {
    id: 'seoul-1/q1',
    lessonId: 'seoul-1',
    area: 'investing',
    prompt:
      'Why doesn\'t +40% followed by −40% bring you back to the start?',
    options: [
      'The −40% is taken from a bigger amount than the +40% was',
      'The bank charges a fee in between',
      'Prices always fall faster than they rise',
    ],
    correctIndex: 0,
    explanation:
      'The second percent applies to the new, larger amount, so the same-sized fall removes more money.',
  },
  {
    id: 'seoul-1/q2',
    lessonId: 'seoul-1',
    area: 'investing',
    prompt:
      'A share fell 50%. What rise does it need to get back to its old price?',
    options: [
      '+50%',
      '+100%',
      '+25%',
    ],
    correctIndex: 1,
    explanation:
      'Half the money has to double to be whole again.',
  },
  {
    id: 'berlin-1/q1',
    lessonId: 'berlin-1',
    area: 'saving',
    prompt:
      'What does an inflation rate of 3% mean?',
    options: [
      'On average, the basket of goods costs 3% more than a year ago',
      'Every price rose by exactly 3%',
      'The bank takes 3% of your balance',
    ],
    correctIndex: 0,
    explanation:
      '[[inflation]] is an average over a basket. Some prices rise much more, some less, some even fall.',
  },
  {
    id: 'berlin-1/q2',
    lessonId: 'berlin-1',
    area: 'saving',
    prompt:
      'Savings earn 2%. Prices rise 3%. What happens to what the money can buy?',
    options: [
      'It shrinks by about 1% a year',
      'It grows by 2% a year',
      'It stays the same, the balance never falls',
    ],
    correctIndex: 0,
    explanation:
      'The [[real-return]] is the interest minus inflation: 2% − 3% ≈ −1%. The balance grows, the buying power shrinks.',
  },
  {
    id: 'berlin-2/q1',
    lessonId: 'berlin-2',
    area: 'saving',
    prompt:
      'True or false: an emergency fund should grow as fast as possible.',
    options: [
      'True',
      'False',
    ],
    correctIndex: 1,
    explanation:
      'False. Its job is to be there at once and keep its value. Fast growth comes with swings, and a surprise does not wait for a good day.',
  },
  {
    id: 'sao-paulo-1/q1',
    lessonId: 'sao-paulo-1',
    area: 'debt',
    prompt:
      'When is “0% interest” really without interest?',
    options: [
      'When paying at once gets no discount at all',
      'Whenever the shop says so',
      'When the payments are small',
    ],
    correctIndex: 0,
    explanation:
      'If the cash price is the same as the total of the payments, the split is free. Any cash discount is the price of waiting.',
  },
];
