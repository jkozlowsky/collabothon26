import type { ComponentProps } from 'react';
import type Feather from '@expo/vector-icons/Feather';

export type IconName = ComponentProps<typeof Feather>['name'];
