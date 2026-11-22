import Feather from '@expo/vector-icons/Feather';
import { Fragment, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { TermRow } from '@/components/glossary/TermRow';
import { categoryStyle } from '@/constants/glossary';
import { colors, elevation, motion, radii, type } from '@/constants/theme';
import type { GlossaryCategory, TermSummary } from '@/types/glossary';

type Props = {
  category: GlossaryCategory;
  expanded: boolean;
  /** Slugs of the saved terms (the star in each row shows and changes it). */
  favorites: ReadonlySet<string>;
  onToggleSaved: (slug: string) => void;
  onToggle: () => void;
  onOpenTerm: (term: TermSummary) => void;
};

const DURATION_MS = 240;
const EASE_OUT = cubicBezier(...motion.easeOut);
// The card's shadow is drawn outside its box; the clipping wrapper gets this much room so it is not cut off.
const SHADOW_ROOM = 8;

/**
 * Collapsible category: tappable header (category icon, name, count, chevron) and, when open, a card with its terms.
 * Opening and closing animate the height (Reanimated CSS transition); the terms leave the tree once closed.
 */
export function CategorySection({ category, expanded, favorites, onToggleSaved, onToggle, onOpenTerm }: Props) {
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : DURATION_MS;

  // `open` trails `expanded` by one frame: a section that has just been mounted starts at height 0,
  // so the change to its real height is animated instead of appearing at once.
  const [open, setOpen] = useState(expanded);
  const [unmounted, setUnmounted] = useState(!expanded);
  const [contentHeight, setContentHeight] = useState<number>();

  if (expanded && unmounted) setUnmounted(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(expanded));
    // Remove the terms from the tree once the closing animation is over (screen readers, keyboard focus).
    const timer = expanded ? undefined : setTimeout(() => setUnmounted(true), duration);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [expanded, duration]);

  const rendered = expanded || !unmounted;
  const look = categoryStyle(category.slug);
  const count = category.terms.length;
  const countLabel = `${count} ${count === 1 ? 'term' : 'terms'}`;

  return (
    <View style={styles.section}>
      <Pressable
        testID={`category-${category.slug}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${category.name}, ${countLabel}`}
        onPress={onToggle}
        style={styles.header}
      >
        <View style={[styles.tile, { backgroundColor: look.tint }]}>
          <Feather name={look.icon} size={18} color={look.color} />
        </View>
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.count}>{countLabel}</Text>
        <Animated.View
          style={[
            { transform: [{ rotate: expanded ? '90deg' : '0deg' }] },
            { transitionProperty: 'transform', transitionDuration: duration, transitionTimingFunction: EASE_OUT },
          ]}
        >
          <Feather name="chevron-right" size={18} color={colors.textPrimary} />
        </Animated.View>
      </Pressable>
      {rendered && (
        <Animated.View
          style={[
            styles.reveal,
            { height: open ? contentHeight : 0, opacity: open ? 1 : 0 },
            { transitionProperty: ['height', 'opacity'], transitionDuration: duration, transitionTimingFunction: EASE_OUT },
          ]}
        >
          {/* Not clamped by the animated height, so onLayout reports the natural height to animate to. */}
          <View style={styles.measure} onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
            <View style={styles.card}>
              {category.terms.map((term, i) => (
                <Fragment key={term.slug}>
                  {i > 0 && <View style={styles.divider} />}
                  <TermRow
                    term={term}
                    saved={favorites.has(term.slug)}
                    onToggleSaved={() => onToggleSaved(term.slug)}
                    onPress={() => onOpenTerm(term)}
                  />
                </Fragment>
              ))}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  // Same 14% tint recipe as the story icon tiles.
  tile: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.titleSection, flex: 1 },
  count: { ...type.labelDefault, color: colors.textMuted },
  reveal: { overflow: 'hidden', marginHorizontal: -SHADOW_ROOM, marginBottom: -SHADOW_ROOM },
  measure: { paddingHorizontal: SHADOW_ROOM, paddingBottom: SHADOW_ROOM },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    ...elevation.low,
  },
  divider: { height: 1, backgroundColor: colors.borderDefault },
});
