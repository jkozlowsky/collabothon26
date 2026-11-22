import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { CountBubble } from '@/components/duel/questions/CountBubble';
import { CARD_REFLOW_MS, sortPressed, type BucketTheme, type SortItem } from '@/components/duel/questions/sortBuckets';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

type Props = {
  /** 0 is the left bucket, 1 the right one. */
  index: number;
  name: string;
  theme: BucketTheme;
  /** The other bucket: where a placed card's arrow sends it. */
  other: { name: string; theme: BucketTheme };
  items: SortItem[];
  /** A card is selected, so a tap on the bucket drops it here. */
  isTarget: boolean;
  isLocked: boolean;
  reducedMotion: boolean;
  onPress: () => void;
  onMove: (itemIndex: number) => void;
  onRemove: (itemIndex: number) => void;
};

/** One bucket of the sort question: coloured header with its count, then the cards placed in it. */
export function SortBucket({ index, name, theme, other, items, isTarget, isLocked, reducedMotion, onPress, onMove, onRemove }: Props) {
  const isLeft = index === 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Bucket: ${name}`}
        testID={`duel-sort-bucket-${index}`}
        disabled={isLocked}
        style={({ pressed }) => [
          styles.bucket,
          { borderColor: theme.color },
          isTarget && [styles.bucketTarget, { backgroundColor: theme.softBg }],
          pressed && !isLocked && sortPressed,
        ]}
      >
        <View style={[styles.header, { backgroundColor: theme.color }]}>
          <View style={styles.titleRow}>
            <Feather name={theme.icon} size={15} color={colors.textOnBrand} />
            <Text style={styles.title} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <CountBubble count={items.length} reducedMotion={reducedMotion} />
        </View>

        <View style={styles.cards}>
          {items.length === 0 ? (
            <View style={styles.emptyHint}>
              <Text style={styles.emptyText}>{isTarget ? 'Tap to sort here' : 'Tap an arrow to sort here'}</Text>
            </View>
          ) : (
            items.map((item) => {
              // No button role on these two: on web it would nest a <button> inside the bucket's <button>.
              const remove = (
                <Pressable
                  onPress={() => onRemove(item.index)}
                  accessibilityLabel="Remove from bucket"
                  disabled={isLocked}
                  style={({ pressed }) => [styles.miniButton, pressed && sortPressed]}
                >
                  <Feather name="x" size={14} color={colors.textMuted} />
                </Pressable>
              );
              const move = (
                <Pressable
                  onPress={() => onMove(item.index)}
                  accessibilityLabel={`Move to ${other.name}`}
                  disabled={isLocked}
                  style={({ pressed }) => [styles.miniButton, pressed && sortPressed]}
                >
                  <Feather name={isLeft ? 'arrow-right' : 'arrow-left'} size={14} color={other.theme.color} />
                </Pressable>
              );
              return (
                <Animated.View
                  key={item.index}
                  layout={reducedMotion ? undefined : LinearTransition.duration(CARD_REFLOW_MS)}
                  style={[styles.card, { borderLeftColor: theme.color }]}
                  testID={`duel-sort-placed-${item.index}`}
                >
                  <Text style={styles.cardText}>{item.text}</Text>
                  {/* The arrow sits on the side of the bucket it points to. */}
                  <View style={styles.actions}>
                    {isLeft ? remove : move}
                    {isLeft ? move : remove}
                  </View>
                </Animated.View>
              );
            })
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  bucket: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    minHeight: 180,
    overflow: 'hidden',
    ...elevation.low,
  },
  bucketTarget: {
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flex: 1,
  },
  title: {
    ...type.labelDefault,
    fontWeight: '700',
    color: colors.textOnBrand,
  },
  cards: {
    flex: 1,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  emptyHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDefault,
    borderRadius: radii.button,
    margin: spacing.xs,
    backgroundColor: colors.dropZoneFill,
  },
  emptyText: {
    ...type.bodyDefault,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.bgCanvas,
    borderRadius: radii.button,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.borderDefault,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  cardText: {
    ...type.labelDefault,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  miniButton: {
    padding: spacing.xs,
    borderRadius: 4,
    backgroundColor: colors.bgSurface,
  },
});
