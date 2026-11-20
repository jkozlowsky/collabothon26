import { StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/bank/Sheet';
import { Tappable } from '@/components/onboarding/ui';
import { Avatar, AVATAR_IDS } from '@/components/profile/Avatar';
import { colors, spacing } from '@/constants/theme';
import type { AvatarId } from '@/types/account';

type Props = { visible: boolean; value: AvatarId; onPick: (id: AvatarId) => void; onClose: () => void };

const SIZE = 84;

/** Bottom sheet with the six avatars: one tap picks and closes. */
export function AvatarPickerSheet({ visible, value, onPick, onClose }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Choose your avatar" testID="avatar-sheet">
      <View style={styles.grid}>
        {AVATAR_IDS.map((id) => (
          <Tappable
            key={id}
            onPress={() => {
              onPick(id);
              onClose();
            }}
            accessibilityRole="radio"
            aria-checked={id === value}
            accessibilityLabel={`Avatar ${id}`}
            haptic="selection"
            pressedScale={0.94}
            testID={`avatar-${id}`}
            style={[styles.ring, id === value && styles.ringSelected]}
          >
            <Avatar id={id} size={SIZE} />
          </Tappable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.lg },
  ring: { padding: 3, borderRadius: SIZE, borderWidth: 2, borderColor: 'transparent' },
  ringSelected: { borderColor: colors.brandPrimary },
});
