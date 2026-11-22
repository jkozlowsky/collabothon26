import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { AvatarId } from '@/types/account';
import type { DuelMode } from '@/types/duel';

type Props = {
  mode: DuelMode;
  selected: boolean;
  avatar: AvatarId;
  onPress: () => void;
};

/** Illustration on the petrol stage: you · VS · "?" for a rival, you with a target badge for solo. */
function Illustration({ mode, avatar }: { mode: DuelMode; avatar: AvatarId }) {
  if (mode === 'SOLO') {
    return (
      <View style={styles.stage}>
        <View>
          <PlayerAvatar avatar={avatar} size={64} ring="accent" />
          <View style={styles.targetBadge}>
            <Icon name="target" size={16} color={colors.textOnAccent} />
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.stage}>
      <PlayerAvatar avatar={avatar} size={48} ring="accent" />
      <View style={styles.vs}>
        <Text style={styles.vsText}>VS</Text>
      </View>
      <View style={styles.unknown}>
        <Text style={styles.unknownText}>?</Text>
      </View>
    </View>
  );
}

/** Illustrated mode tile (Figma v4·1 / v4·2). Selected: accent border and a check. */
export function ModeTile({ mode, selected, avatar, onPress }: Props) {
  const human = mode === 'HUMAN';
  const label = human ? 'vs Rival' : 'Solo';
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      aria-checked={selected}
      accessibilityLabel={label}
      testID={human ? 'duel-mode-human' : 'duel-mode-solo'}
      containerStyle={styles.wrap}
      style={[styles.tile, selected && styles.selected]}
    >
      <Illustration mode={mode} avatar={avatar} />
      <Text style={styles.title}>{label}</Text>
      {selected && (
        <View style={styles.check} testID={human ? 'duel-mode-human-check' : 'duel-mode-solo-check'}>
          <Feather name="check" size={14} color={colors.textOnAccent} />
        </View>
      )}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tile: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.md,
  },
  selected: { borderColor: colors.brandAccent, backgroundColor: colors.brandAccentSoft },
  stage: {
    height: 74,
    borderRadius: radii.tile,
    backgroundColor: colors.brandPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  vs: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brandAccent, alignItems: 'center', justifyContent: 'center' },
  vsText: { ...type.labelTab, color: colors.textOnAccent, fontWeight: '700' },
  unknown: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.onBrandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unknownText: { ...type.titleSection, color: colors.textOnBrand },
  targetBadge: {
    position: 'absolute',
    right: -8,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.titleCard, color: colors.textPrimary, paddingHorizontal: spacing.xs },
  check: {
    position: 'absolute',
    top: -10,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandAccent,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
