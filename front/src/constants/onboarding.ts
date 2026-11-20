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

/** Grouped loosely: everyday money, saving, borrowing, investing, protecting and planning. */
export const GOALS: { value: Goal; label: string }[] = [
  { value: 'budget', label: 'Budget & track spending' },
  { value: 'money-habits', label: 'Build better money habits' },
  { value: 'banking-basics', label: 'Get more from my bank account' },
  { value: 'start-saving', label: "Start saving — I don't save yet" },
  { value: 'emergency-fund', label: 'Build an emergency fund' },
  { value: 'big-purchase', label: 'Save for a big purchase' },
  { value: 'buy-home', label: 'Save for a home' },
  { value: 'pay-off-debt', label: 'Pay off debt' },
  { value: 'credit-cards', label: 'Credit cards & overdrafts' },
  { value: 'loans-mortgages', label: 'Understand loans & mortgages' },
  { value: 'start-investing', label: 'Start investing' },
  { value: 'stocks', label: 'How stocks work' },
  { value: 'etfs', label: 'Understand ETFs' },
  { value: 'bonds', label: 'Bonds & safer options' },
  { value: 'diversification', label: "Don't put all eggs in one basket" },
  { value: 'sustainable-investing', label: 'Sustainable investing' },
  { value: 'crypto', label: 'Crypto: what it is & its risks' },
  { value: 'inflation', label: 'Beat inflation' },
  { value: 'risk', label: 'Manage risk' },
  { value: 'insurance', label: 'Insurance basics' },
  { value: 'scams', label: 'Avoid scams' },
  { value: 'taxes', label: 'Taxes basics' },
  { value: 'kids-future', label: "Kids' future" },
  { value: 'family-money', label: 'Talk money with family' },
  { value: 'retirement', label: 'Plan retirement' },
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
