import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, ScrollView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { StoryCard } from '@/components/StoryCard';
import { colors, elevation, nav, radii, spacing, type } from '@/constants/theme';
import { isDone, sortStories, storyState } from '@/lib/stories';
import type { Story } from '@/types/stories';

type Props = {
  stories: Story[];
  /** Height of the screen area the sheet lives in. */
  height: number;
  /** Top edge of the sheet at half height: just under the globe. */
  halfTop: number;
  /** Top edge of the sheet at its lowest (the default): only the handle and the header show above the nav. */
  peekTop: number;
  /** The sheet's top edge, owned by the screen so the globe can move with the sheet. */
  top: SharedValue<number>;
  onSelect: (id: string) => void;
  /** The story the Quick check picked, with its "Why here" line. */
  startHere?: { storyId: string; why: string } | null;
};

export type SheetStop = 'peek' | 'half' | 'full';

/** How much of the sheet shows above the floating nav at the peek stop: handle, header and a strip of the first card. */
export const SHEET_PEEK = 96;
/** Expanded, the sheet leaves this share of the area above it (the dimmed globe). */
const EXPANDED_GAP = 0.1;
/** A fling's travel is projected this many seconds ahead when picking the snap position. */
const PROJECTION = 0.15;
const SPRING = { damping: 26, stiffness: 260 };

/**
 * Figma story list sheet (3:616) with three stops: peek (low, the default), half (just under the globe) and
 * full (~90 %, over the dimmed globe). The handle and header drag it; a tap on the handle steps it up and back.
 */
export function StorySheet({ stories, height, halfTop, peekTop, top, onSelect, startHere }: Props) {
  const expandedTop = Math.round(height * EXPANDED_GAP);
  const [stop, setStop] = useState<SheetStop>('peek');
  const expanded = stop === 'full';
  const start = useSharedValue(0);

  // Follows layout changes (rotation, web resize) without fighting a drag.
  useEffect(() => {
    top.set(withSpring(stop === 'full' ? expandedTop : stop === 'half' ? halfTop : peekTop, SPRING));
  }, [stop, expandedTop, halfTop, peekTop, top]);

  const pan = usePanGesture({
    activeOffsetY: [-6, 6],
    onBegin: () => {
      start.set(top.value);
    },
    onUpdate: (e) => {
      top.set(Math.min(peekTop, Math.max(expandedTop, start.value + e.translationY)));
    },
    onDeactivate: (e) => {
      // The stop nearest to where the fling would carry the sheet.
      const projected = top.value + e.velocityY * PROJECTION;
      const near = (y: number) => Math.abs(projected - y);
      const next: SheetStop = near(expandedTop) < near(halfTop) ? 'full' : near(halfTop) <= near(peekTop) ? 'half' : 'peek';
      top.set(withSpring(next === 'full' ? expandedTop : next === 'half' ? halfTop : peekTop, SPRING));
      scheduleOnRN(setStop, next);
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: top.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(top.value, [expandedTop, halfTop], [1, 0], 'clamp'),
  }));

  const select = (id: string) => {
    // Back down so the globe shows the flight; from peek the sheet stays where it is.
    if (stop === 'full') setStop('half');
    onSelect(id);
  };

  const done = stories.filter(isDone).length;

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} pointerEvents={expanded ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setStop('half')} accessibilityLabel="Collapse stories" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { height: height - expandedTop }, sheetStyle]} testID="story-sheet">
        <GestureDetector gesture={pan}>
          <View>
            <Pressable
              style={styles.handleArea}
              onPress={() => setStop((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'))}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Collapse stories' : 'Expand stories'}
              testID="story-sheet-handle"
            >
              <View style={styles.handle} />
            </Pressable>
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                Your journeys
              </Text>
              <Text style={styles.meta}>
                {stories.length} paths · {done} done
              </Text>
            </View>
          </View>
        </GestureDetector>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {sortStories(stories).map((s) => (
            <StoryCard
              key={s.id}
              story={s}
              state={storyState(s)}
              onPress={() => select(s.id)}
              startHere={startHere?.storyId === s.id ? startHere : undefined}
            />
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
