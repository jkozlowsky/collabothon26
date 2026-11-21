import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, ScrollView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { StoryCard } from '@/components/StoryCard';
import { colors, elevation, nav, radii, spacing, type } from '@/constants/theme';
import { isDone, sortStories, storyState } from '@/lib/stories';
import type { Story } from '@/types/stories';

type Props = {
  stories: Story[];
  /** Height of the screen area the sheet lives in. */
  height: number;
  /** Distance from the top of that area to the collapsed sheet's top edge. */
  collapsedTop: number;
  onSelect: (id: string) => void;
};

/** Expanded, the sheet leaves this share of the area above it (the dimmed globe). */
const EXPANDED_GAP = 0.1;
/** A fling's travel is projected this many seconds ahead when picking the snap position. */
const PROJECTION = 0.15;
const SPRING = { damping: 26, stiffness: 260 };

/**
 * Figma story list sheet (3:616): two positions, collapsed under the globe and expanded to ~90 %.
 * The handle and header drag it; a tap on the handle toggles it; the list scrolls inside.
 */
export function StorySheet({ stories, height, collapsedTop, onSelect }: Props) {
  const expandedTop = Math.round(height * EXPANDED_GAP);
  const [expanded, setExpanded] = useState(false);
  const top = useSharedValue(collapsedTop);
  const start = useSharedValue(0);

  // Follows layout changes (rotation, web resize) without fighting a drag.
  useEffect(() => {
    top.set(withSpring(expanded ? expandedTop : collapsedTop, SPRING));
  }, [expanded, expandedTop, collapsedTop, top]);

  const pan = usePanGesture({
    activeOffsetY: [-6, 6],
    onBegin: () => {
      start.set(top.value);
    },
    onUpdate: (e) => {
      top.set(Math.min(collapsedTop, Math.max(expandedTop, start.value + e.translationY)));
    },
    onDeactivate: (e) => {
      const projected = top.value + e.velocityY * PROJECTION;
      const open = Math.abs(projected - expandedTop) < Math.abs(projected - collapsedTop);
      top.set(withSpring(open ? expandedTop : collapsedTop, SPRING));
      scheduleOnRN(setExpanded, open);
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: top.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(top.value, [expandedTop, collapsedTop], [1, 0], 'clamp'),
  }));

  const select = (id: string) => {
    setExpanded(false);
    onSelect(id);
  };

  const done = stories.filter(isDone).length;

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} pointerEvents={expanded ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setExpanded(false)} accessibilityLabel="Collapse stories" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { height: height - expandedTop }, sheetStyle]} testID="story-sheet">
        <GestureDetector gesture={pan}>
          <View>
            <Pressable
              style={styles.handleArea}
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Collapse stories' : 'Expand stories'}
              testID="story-sheet-handle"
            >
              <View style={styles.handle} />
            </Pressable>
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                Your stories
              </Text>
              <Text style={styles.meta}>
                {stories.length} paths · {done} done
              </Text>
            </View>
          </View>
        </GestureDetector>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {sortStories(stories).map((s) => (
            <StoryCard key={s.id} story={s} state={storyState(s)} onPress={() => select(s.id)} />
          ))}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.lg,
    ...elevation.sheet,
  },
  // Taller than the visible handle so it is easy to grab.
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: spacing.md },
  handle: { width: 40, height: 5, borderRadius: radii.pill, backgroundColor: colors.borderStrong },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },
  title: type.titleSection,
  meta: { ...type.labelDefault, color: colors.textMuted },
  // Clears the floating nav. Collapsed, the lower cards sit below the screen; expanding reaches them.
  list: { gap: 10, paddingBottom: nav.clearance + spacing.lg },
});
