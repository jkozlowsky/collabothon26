import type { ComponentProps } from 'react';
import type Feather from '@expo/vector-icons/Feather';

import type { ConfidenceArea, Experience, Goal, LearningStyle, LifeStage } from '@/types/onboarding';

export type IconName = ComponentProps<typeof Feather>['name'];

export type Option<T> = { value: T; title: string; subtitle: string; icon: IconName };

export const LIFE_STAGES: Option<LifeStage>[] = [
  { value: 'student', title: 'Studying or just started working', subtitle: 'First salary, first savings', icon: 'book-open' },
  { value: 'family', title: 'Building a family', subtitle: 'Kids, home, bigger goals', icon: 'home' },
  { value: 'established', title: 'Established career', subtitle: 'Growing what you have', icon: 'briefcase' },
  { value: 'pre-retirement', title: 'Getting close to retirement', subtitle: 'Protecting and planning', icon: 'sun' },
];

/** Topics for the goals question: five areas of three, so the whole step fits one phone screen. */
export const GOAL_GROUPS: { title: string; goals: { value: Goal; label: string }[] }[] = [
  {
    title: 'Everyday money',
    goals: [
      { value: 'budget', label: 'Budgeting' },
      { value: 'money-habits', label: 'Money habits' },
      { value: 'banking-basics', label: 'Banking' },
    ],
  },
  {
    title: 'Saving',
    goals: [
      { value: 'start-saving', label: 'Start saving' },
      { value: 'emergency-fund', label: 'Safety net' },
      { value: 'inflation', label: 'Inflation' },
    ],
  },
  {
    title: 'Borrowing',
    goals: [
      { value: 'pay-off-debt', label: 'Debt' },
      { value: 'credit-cards', label: 'Credit cards' },
      { value: 'loans-mortgages', label: 'Loans' },
    ],
  },
  {
    title: 'Investing',
    goals: [
      { value: 'start-investing', label: 'First steps' },
      { value: 'stocks-etfs', label: 'Stocks & ETFs' },
      { value: 'crypto', label: 'Crypto' },
    ],
  },
  {
    title: 'Protect & plan',
    goals: [
      { value: 'retirement', label: 'Retirement' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'scams', label: 'Scams' },
    ],
  },
];

export const EXPERIENCE: Option<Experience>[] = [
  { value: 'not-saving', title: "I don't save yet", subtitle: "But I'd like to start", icon: 'flag' },
  { value: 'none', title: "I save, but don't invest yet", subtitle: 'Savings account or a piggy bank', icon: 'credit-card' },
  { value: 'tried', title: 'Tried it once or twice', subtitle: 'Bought a share or an ETF', icon: 'feather' },
  { value: 'regular', title: 'I invest regularly', subtitle: 'Savings plan or own portfolio', icon: 'trending-up' },
  { value: 'experienced', title: "I'm pretty experienced", subtitle: 'Stocks, bonds, funds, more', icon: 'bar-chart-2' },
];

export const LEARNING_STYLES: Option<LearningStyle>[] = [
  { value: 'simple', title: 'Keep it simple', subtitle: 'Plain language, everyday examples', icon: 'book' },
  { value: 'detailed', title: 'Give me the details', subtitle: 'Proper terms and the why behind them', icon: 'layers' },
  { value: 'visual', title: 'Show me visually', subtitle: 'Charts, visuals and short videos', icon: 'play-circle' },
  { value: 'practice', title: 'Let me practise', subtitle: 'Real-life scenarios and decisions', icon: 'zap' },
];

export const CONFIDENCE_AREAS: Option<ConfidenceArea>[] = [
  { value: 'budgeting', title: 'Everyday money', subtitle: 'Budgeting & spending', icon: 'credit-card' },
  { value: 'saving', title: 'Saving', subtitle: 'Safety net & goals', icon: 'umbrella' },
  { value: 'investing', title: 'Investing', subtitle: 'Stocks, ETFs & funds', icon: 'trending-up' },
];

/** Short meaning of each point on the 1-5 confidence scale. */
export const CONFIDENCE_LABELS = ['Not at all', 'A little', 'Somewhat', 'Fairly', 'Very'] as const;
