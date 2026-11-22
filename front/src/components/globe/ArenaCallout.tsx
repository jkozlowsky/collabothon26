import Feather from '@expo/vector-icons/Feather';
import { Text, View } from 'react-native';

import { calloutStyles as styles } from '@/components/globe/PinCallout';
import { Tappable } from '@/components/onboarding/ui';
import { colors } from '@/constants/theme';

type Props = {
  onOpen: () => void;
};

/** The duel arena's callout: the pin callout's card with fixed texts. */
export function ArenaCallout({ onOpen }: Props) {
  return (
    <View style={styles.card} testID="pin-callout-arena">
      <Text style={styles.overline}>Arena</Text>
      <Text style={styles.title}>Challenge others</Text>
      <Text style={styles.meta}>Financial duels</Text>
      <Tappable
        onPress={onOpen}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Play in arena"
        testID="pin-callout-arena-open"
        containerStyle={styles.buttonWrap}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>Play</Text>
        <Feather name="arrow-right" size={16} color={colors.textOnAccent} />
      </Tappable>
    </View>
  );
}
