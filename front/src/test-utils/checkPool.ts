import type { CheckQuestion } from '@/types/quickCheck';

/** Six quiz steps of the lessons, as GET /api/check-questions returns them (docs/specs/F1b-quick-check.md, v5). */
export const POOL: CheckQuestion[] = [
  {
    id: 'seoul-1/q1',
    lessonId: 'seoul-1',
    area: 'investing',
    prompt:
      'Why doesn\'t +40% followed by −40% bring Ji-woo back to zero?',
    options: [
      'The −40% is taken from a bigger amount than the +40% was',
      'The bank charges a fee in between',
      'Prices always fall faster than they rise',
    ],
    correctIndex: 0,
    explanation:
      '₩10M × 1.4 × 0.6 = ₩8.4M. The second percent applies to the new, larger amount, so the same-sized drop removes more won.',
  },
  {
    id: 'seoul-1/q2',
    lessonId: 'seoul-1',
    area: 'investing',
    prompt:
      'XYZ fell 50%. What rise does it need to get back to its old price?',
    options: [
      '+50%',
      '+100%',
      '+25%',
    ],
    correctIndex: 1,
    explanation:
      'Half the money has to double to be whole again: ₩5M × 2 = ₩10M.',
  },
  {
    id: 'berlin-1/q1',
    lessonId: 'berlin-1',
    area: 'saving',
    prompt:
      'True or false: money in a savings account cannot lose value.',
    options: [
      'True',
      'False',
    ],
    correctIndex: 1,
    explanation:
      'False. The balance does not fall, but prices rise. If the interest is lower than the price rise, the money buys less each year. The difference between interest and price rise is the [[real-return]].',
  },
  {
    id: 'berlin-1/q2',
    lessonId: 'berlin-1',
    area: 'saving',
    prompt:
      'An account pays 1% a year. Prices rise by 3% a year. What happens to the money?',
    options: [
      'The balance grows, but it buys about 2% less each year',
      'Nothing, because the balance never falls',
      'The balance falls by 3% each year',
    ],
    correctIndex: 0,
    explanation:
      'The balance rises by 1%. Prices rise by 3%. So the money buys about 2% less each year, even though the number on the screen goes up.',
  },
  {
    id: 'berlin-2/q1',
    lessonId: 'berlin-2',
    area: 'saving',
    prompt:
      'True or false: with compound interest, money grows by the same amount every year.',
    options: [
      'True',
      'False',
    ],
    correctIndex: 1,
    explanation:
      'False. Each year, the earnings from earlier years earn too. So the amount added each year gets bigger.',
  },
  {
    id: 'sao-paulo-1/q1',
    lessonId: 'sao-paulo-1',
    area: 'debt',
    prompt:
      'When is "12x sem juros" really without interest?',
    options: [
      'When paying at once gets no discount at all',
      'Whenever the store says so',
      'When the payments are small',
    ],
    correctIndex: 0,
    explanation:
      'If the cash price is the same as the total of the payments, the split is free. Any cash discount is the price of waiting.',
  },
];
