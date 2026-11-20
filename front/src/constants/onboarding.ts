import type { ComponentProps } from 'react';
import type Feather from '@expo/vector-icons/Feather';

import type { Experience, Goal, LifeStage } from '@/types/onboarding';

export type IconName = ComponentProps<typeof Feather>['name'];

export type Option<T> = { value: T; title: string; subtitle: string; icon: IconName };

export const LIFE_STAGES: Option<LifeStage>[] = [
  { value: 'starting-out', title: 'Just starting out', subtitle: 'Studying, a first job, first money of my own', icon: 'book-open' },
  { value: 'building', title: 'Building my life', subtitle: 'Career, a home, maybe a family', icon: 'home' },
  { value: 'settled', title: 'Settled in', subtitle: 'Steady income, looking further ahead', icon: 'briefcase' },
  { value: 'later-life', title: 'Thinking about later life', subtitle: 'Retirement is close or already here', icon: 'sun' },
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
  { value: 'occasional', title: 'I save now and then', subtitle: "Whatever's left at the end of the month", icon: 'credit-card' },
  { value: 'regular', title: 'I save regularly', subtitle: 'A budget and a safety net', icon: 'shield' },
  { value: 'investing', title: 'I save and invest', subtitle: 'Funds, ETFs or shares', icon: 'trending-up' },
  { value: 'planning', title: 'I plan my finances ahead', subtitle: 'Budget, savings, investments, retirement', icon: 'bar-chart-2' },
];
