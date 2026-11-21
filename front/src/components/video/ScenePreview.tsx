import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Slider } from '@/components/bank/Slider';
import { Tappable } from '@/components/onboarding/ui';
import { Scene } from '@/components/video/Scene';
import { colors, radii, scenePalette, spacing, storyColors, type } from '@/constants/theme';
import { captionAt, resolveScene } from '@/lib/sceneClock';
import type { Lesson } from '@/types/lessons';

type Props = { lesson: Lesson; sceneId: string };

const DEMO_SAVINGS = { value: 12450, currency: 'EUR' };

/**
 * Authoring tool (§8): one scene at full player size, frozen at `t`, with a scrubber, ±0.1 s, the choice
 * picker for `byChoice`, a "no data" switch for the personal scene, and `t` to copy into the JSON.
 */
export function ScenePreview({ lesson, sceneId }: Props) {
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  const scene = lesson.video?.scenes.find((s) => s.id === sceneId);
  const [time, setTime] = useState(0);
  const [choice, setChoice] = useState(0);
  const [noData, setNoData] = useState(false);
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(time);
  }, [t, time]);

  const resolved = useMemo(
    () =>
      scene &&
      resolveScene(scene, scene.byChoice ? { [scene.byChoice.step]: choice } : {}, () => (noData ? null : DEMO_SAVINGS)),
    [scene, choice, noData],
  );
  if (!scene || !resolved) return <Text style={styles.body}>No scene {sceneId} in {lesson.id}.</Text>;

  const height = Math.round(width * 0.8);
  const caption = resolved.captions[captionAt(resolved.captions, time)]?.text;
  const choices = scene.byChoice ? Object.keys(scene.byChoice).filter((k) => k !== 'step') : [];
  const nudge = (d: number) => setTime((v) => Math.min(resolved.duration, Math.max(0, Math.round((v + d) * 10) / 10)));

  return (
    <ScrollView contentContainerStyle={styles.page} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      <View style={{ height }}>
        <Scene
          scene={resolved}
          t={t}
          length={resolved.duration}
          width={width}
          height={height}
          color={storyColors[lesson.color] ?? colors.storySlate}
          landmark={lesson.landmark}
          seed={lesson.story}
          reducedMotion={false}
        />
        {caption && <Text style={styles.caption}>{caption}</Text>}
      </View>
      <View style={styles.controls}>
        <Text style={styles.title}>
          {lesson.id} · {scene.id} · t = {time.toFixed(1)} s / {resolved.duration} s
        </Text>
        <Slider value={time} min={0} max={resolved.duration} step={0.1} onChange={setTime} accessibilityLabel="Scene time" testID="preview-scrub" />
        <View style={styles.row}>
          <Chip label="−0.1 s" onPress={() => nudge(-0.1)} />
          <Chip label="+0.1 s" onPress={() => nudge(0.1)} />
          <Chip label="Start" onPress={() => setTime(0)} />
          <Chip label="End" onPress={() => setTime(resolved.duration)} />
        </View>
        {choices.length > 0 && (
          <View style={styles.row}>
            <Text style={styles.body}>Choice in {scene.byChoice?.step}:</Text>
            {choices.map((k) => (
              <Chip key={k} label={k} on={choice === Number(k)} onPress={() => setChoice(Number(k))} />
            ))}
          </View>
        )}
        {scene.noData && <Chip label={noData ? 'No data: on' : 'No data: off'} on={noData} onPress={() => setNoData(!noData)} />}
        <Text style={styles.body}>Captions (at · text):</Text>
        {resolved.captions.map((c) => (
          <Text key={c.at} style={styles.body}>
            {c.at.toFixed(1)} · {c.text}
          </Text>
        ))}
        <View style={styles.row}>
          {lesson.video?.scenes.map((s) => (
            <Chip
              key={s.id}
              label={s.id}
              on={s.id === scene.id}
              onPress={() => router.setParams({ sceneId: s.id })}
            />
          ))}
        </View>
        <Button label="Close" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.bgCanvas, paddingBottom: spacing.xxxl },
  caption: {
    ...type.titleCard,
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    textAlign: 'center',
    color: scenePalette.onScene,
    backgroundColor: scenePalette.captionPill,
    borderRadius: radii.button,
    overflow: 'hidden',
  },
  controls: { padding: spacing.lg, gap: spacing.md },
  title: type.titleCard,
  body: { ...type.bodyDefault, color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.brandPrimarySoft },
  chipOn: { backgroundColor: colors.brandPrimary },
  chipText: { ...type.labelStrong, color: colors.brandPrimary },
  chipTextOn: { color: colors.textOnBrand },
});
