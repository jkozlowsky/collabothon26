import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { BankIconName } from '@/types/bank';

type Props = { name: BankIconName; size?: number; color: string };

type Glyph = { set: 'feather'; name: ComponentProps<typeof Feather>['name'] } | { set: 'ion'; name: ComponentProps<typeof Ionicons>['name'] };

/** Figma uses 2px-stroke line icons; Feather matches them, Ionicons outline fills the few gaps. */
const GLYPHS: Record<BankIconName, Glyph> = {
  home: { set: 'feather', name: 'home' },
  transfer: { set: 'ion', name: 'swap-horizontal' },
  percent: { set: 'feather', name: 'percent' },
  trending: { set: 'feather', name: 'trending-up' },
  globe: { set: 'feather', name: 'globe' },
  card: { set: 'feather', name: 'credit-card' },
  book: { set: 'feather', name: 'book' },
  user: { set: 'feather', name: 'user' },
  scan: { set: 'feather', name: 'maximize' },
  bell: { set: 'feather', name: 'bell' },
  plus: { set: 'feather', name: 'plus' },
  more: { set: 'feather', name: 'more-horizontal' },
  eye: { set: 'feather', name: 'eye' },
  'eye-off': { set: 'feather', name: 'eye-off' },
  search: { set: 'feather', name: 'search' },
  calendar: { set: 'feather', name: 'calendar' },
  cart: { set: 'feather', name: 'shopping-cart' },
  briefcase: { set: 'feather', name: 'briefcase' },
  play: { set: 'feather', name: 'youtube' },
  safe: { set: 'feather', name: 'disc' },
  zap: { set: 'feather', name: 'zap' },
  phone: { set: 'feather', name: 'smartphone' },
  pie: { set: 'feather', name: 'pie-chart' },
  leaf: { set: 'ion', name: 'leaf-outline' },
  bond: { set: 'feather', name: 'file-text' },
  cash: { set: 'feather', name: 'database' },
  coffee: { set: 'feather', name: 'coffee' },
  fuel: { set: 'feather', name: 'droplet' },
  train: { set: 'ion', name: 'train-outline' },
  heart: { set: 'feather', name: 'heart' },
  gift: { set: 'feather', name: 'gift' },
  'chevron-right': { set: 'feather', name: 'chevron-right' },
  'chevron-left': { set: 'feather', name: 'chevron-left' },
  close: { set: 'feather', name: 'x' },
  check: { set: 'feather', name: 'check' },
  delete: { set: 'feather', name: 'delete' },
};

export function Icon({ name, size = 22, color }: Props) {
  const g = GLYPHS[name];
  return g.set === 'feather' ? <Feather name={g.name} size={size} color={color} /> : <Ionicons name={g.name} size={size} color={color} />;
}
