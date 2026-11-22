import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useRollUp } from '@/hooks/useRollUp';

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  delayMs?: number;
  durationMs?: number;
  style?: StyleProp<TextStyle>;
  onDone?: () => void;
  testID?: string;
};

/** A number that rolls up from 0. Its own component so only this text re-renders on every frame. */
export function CountUpText({ value, prefix = '', suffix = '', delayMs, durationMs, style, onDone, testID }: Props) {
  const shown = useRollUp(value, { delayMs, durationMs, onDone });
  return (
    <Text style={style} testID={testID}>
      {prefix}
      {shown}
      {suffix}
    </Text>
  );
}
