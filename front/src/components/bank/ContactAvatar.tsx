import { StyleSheet, Text, View } from 'react-native';

import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, tints, type } from '@/constants/theme';
import type { Contact } from '@/types/bank';

type Props = { contact: Contact; onPress: () => void; size?: number };

const TONE: Record<Contact['tone'], { bg: string; ink: string }> = {
  rose: { bg: tints.rose, ink: colors.storyRose },
  violet: { bg: tints.violet, ink: colors.storyViolet },
  teal: { bg: tints.teal, ink: colors.storyTeal },
  orange: { bg: tints.orange, ink: colors.storyOrange },
  slate: { bg: tints.slate, ink: colors.textMuted },
};

/** Initials circle + name, in the Payments contacts row and the transfer recipient list. */
export function ContactAvatar({ contact, onPress, size = 44 }: Props) {
  const tone = TONE[contact.tone];
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Send money to ${contact.name}`} testID={`contact-${contact.id}`} pressedScale={0.94}>
      <View style={styles.item}>
        <View style={[styles.circle, { width: size, height: size, backgroundColor: tone.bg }]}>
          <Text style={[styles.initials, { color: tone.ink }]}>{contact.initials}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {contact.name}
        </Text>
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', gap: 6, width: 60 },
  circle: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  initials: type.labelStrong,
  name: type.labelDefault,
});
