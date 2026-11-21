import type { ComponentProps } from 'react';
import type Feather from '@expo/vector-icons/Feather';

import type { Goal, Purpose } from '@/types/onboarding';

export type IconName = ComponentProps<typeof Feather>['name'];

export type Option<T> = { value: T; title: string; subtitle: string; icon: IconName };

/** "What are you saving for?": one choice, saved on the profile as the goals it stands for. */
export const PURPOSES: (Option<Purpose> & { goals: Goal[] })[] = [
  { value: 'home', title: 'A home of my own', subtitle: 'A deposit or the purchase itself', icon: 'home', goals: ['start-saving', 'inflation'] },
  { value: 'safety-net', title: 'A safety net', subtitle: 'Money for the unexpected', icon: 'shield', goals: ['emergency-fund'] },
  { value: 'retirement', title: 'Retirement', subtitle: 'Income for later life', icon: 'sunrise', goals: ['retirement'] },
  { value: 'growing', title: 'Growing it long term', subtitle: 'No fixed date in mind', icon: 'trending-up', goals: ['start-investing'] },
  { value: 'none', title: 'No plan yet', subtitle: 'It just sits there for now', icon: 'help-circle', goals: [] },
];
