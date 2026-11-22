import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { Scene } from '@/components/video/Scene';
import { CANVAS } from '@/components/video/kit/canvas';
import { radii, scenePalette, spacing, type } from '@/constants/theme';
import { captionAt, formatClock, layerProgress, type ResolvedScene } from '@/lib/sceneClock';
import type { LandmarkKind } from '@/types/stories';

export type SegmentState = 'done' | 'now' | 'todo';

type Props = {
  scene: ResolvedScene;
  /** Start playing on mount: the current beat (unless reduced motion), or "Watch again". */
  autoplay: boolean;
  /** "Lesson 1" */
  heading: string;
  segments: SegmentState[];
  color: string;
  landmark: { kind: LandmarkKind; at: number } | null;
  seed: string;
  width: number;
  /** Player height under the top safe-area inset; the scene keeps its aspect ratio, centred in it. */
  height: number;
  topInset: number;
  /** Narration of this scene; null plays it silent on its JSON timings. */
  audioUrl: string | null;
  muted: boolean;
  onToggleMute: () => void;
  /** Opens the transcript (classic form); hidden on "Watch again". */
  onTranscript?: () => void;
  onClose: () => void;
  /** Leaves the scene before it ends. */
  onSkip: () => void;
  /** The scene played to its end. */
  onEnded: () => void;
  reducedMotion: boolean;
};

type MediaButtonProps = {
  icon: 'close' | 'volume-on' | 'volume-off' | 'replay' | 'pause' | 'play-fill';
  label: string;
  onPress: () => void;
  testID: string;
};

/** Drift between the narration and the clock that triggers a resync, in seconds. */
const MAX_DRIFT = 0.15;
const CAPTION_FADE_MS = 200;

/**
 * The full-screen dark video player: segments, title row (close, lesson, mute, transcript), the scene, captions,
 * play controls and Skip. Owns the scene clock `t` and the narration; the audio is the master when there is one (§7.1).
 */
export function ScenePlayer({
  scene,
  autoplay,
  heading,
  segments,
  color,
  landmark,
  seed,
  width,
  height,
  topInset,
  audioUrl,
  muted,
  onToggleMute,
  onTranscript,
  onClose,
  onSkip,
  onEnded,
  reducedMotion,
}: Props) {
  const t = useSharedValue(0);
  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const status = useAudioPlayerStatus(player);
  const hasAudio = !!audioUrl && status.isLoaded && status.duration > 0;
  const length = hasAudio ? status.duration : scene.duration;

  // The parent remounts the player per scene, so the mount effect only drives the clock.
  const [playing, setPlaying] = useState(autoplay);
  const [ended, setEnded] = useState(false);
  const [caption, setCaption] = useState(-1);
  const [second, setSecond] = useState(0);
  const endedRef = useRef(false);
  const latest = useRef({ onEnded, length, hasAudio });
  useEffect(() => {
    latest.current = { onEnded, length, hasAudio };
  });

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setPlaying(false);
    setEnded(true);
    setCaption(scene.captions.length - 1);
    latest.current.onEnded();
  }, [scene.captions.length]);

  const run = useCallback(
    (from: number) => {
      const total = latest.current.length;
      t.set(from);
      t.set(
        // The clock is playback time, not motion: it runs at real speed under reduced motion too.
        withTiming(total, { duration: Math.max(0, total - from) * 1000, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      );
    },
    [t, finish],
  );

  const play = useCallback(
    (fromStart: boolean) => {
      const from = fromStart || endedRef.current ? 0 : t.get();
      endedRef.current = false;
      setEnded(false);
      setPlaying(true);
      setCaption(captionAt(scene.captions, from));
      run(from);
      if (latest.current.hasAudio) {
        player.seekTo(from).catch(() => {});
        // Web autoplay: the lesson starts from a tap, so this is allowed; if not, the scene still plays on its clock.
        player.play();
      }
    },
    [t, run, player, scene.captions],
  );

  const pause = useCallback(() => {
    cancelAnimation(t);
    setPlaying(false);
    if (latest.current.hasAudio) player.pause();
  }, [t, player]);

  const startOnMount = useEffectEvent(() => {
    if (!autoplay) return;
    run(0);
    if (latest.current.hasAudio) player.play();
  });
  // Runs once: `t` is the same shared value for the player's life, and the parent remounts it for a new scene.
  useEffect(() => {
    startOnMount();
    return () => cancelAnimation(t);
  }, [t]);

  // The file usually loads after the scene started on its JSON timing: retarget the clock to the file's length
  // and start the narration where the clock is.
  const syncToAudio = useEffectEvent(() => {
    if (!playing || endedRef.current) return;
    const at = t.get();
    run(at);
    player.seekTo(at).catch(() => {});
    player.play();
  });
  // Only when the file becomes ready: pausing and resuming go through `play`.
  useEffect(() => {
    if (hasAudio) syncToAudio();
  }, [hasAudio]);

  // The narration is the master: resync the clock when it drifts, end the scene with the file.
  useEffect(() => {
    if (!hasAudio || !playing) return;
    if (status.didJustFinish) {
      finish();
      return;
    }
    if (Math.abs(t.get() - status.currentTime) > MAX_DRIFT) run(status.currentTime);
  }, [status.currentTime, status.didJustFinish, hasAudio, playing, t, run, finish]);

  useEffect(() => {
    // expo-audio exposes volume as a property; muting keeps the scene's timing.
    // eslint-disable-next-line react-hooks/immutability
    player.volume = muted ? 0 : 1;
  }, [muted, player]);

  const captions = scene.captions;
  useAnimatedReaction(
    () => captionAt(captions, t.get()),
    (i, before) => {
      if (i !== before) scheduleOnRN(setCaption, i);
    },
  );
  useAnimatedReaction(
    () => Math.floor(t.get()),
    (s, before) => {
      if (s !== before) scheduleOnRN(setSecond, s);
    },
  );
  const progressStyle = useAnimatedStyle(() => ({ width: `${layerProgress(t.get(), 0, length) * 100}%` }));

  const line = caption >= 0 ? captions[caption]?.text : undefined;
  const control: Omit<MediaButtonProps, 'testID'> = ended
    ? { icon: 'replay', label: 'Replay', onPress: () => play(true) }
    : playing
      ? { icon: 'pause', label: 'Pause', onPress: pause }
      : { icon: 'play-fill', label: 'Play', onPress: () => play(false) };

  // Scenes are drawn landscape: full width at their own ratio, centred in the vertical player.
  const sceneHeight = Math.min(height, Math.round((width * CANVAS.height) / CANVAS.width));

  return (
    <View style={[styles.player, { height: height + topInset }]} testID="scene-player">
      <View
        style={[styles.scene, { top: topInset + Math.round((height - sceneHeight) / 2) }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Scene: ${scene.title}. ${captions.map((c) => c.text).join(' ')}`}
      >
        <Scene
          scene={scene}
          t={t}
          length={length}
          width={width}
          height={sceneHeight}
          color={color}
          landmark={landmark}
          seed={seed}
          reducedMotion={reducedMotion}
        />
      </View>

      <Scrim edge="top" height={topInset + 96} />
      <Scrim edge="bottom" height={120} />

      <View style={[styles.top, { paddingTop: topInset + spacing.sm }]}>
        <View style={styles.segments} accessible accessibilityLabel={`Part ${segments.indexOf('now') + 1} of ${segments.length}`}>
          {segments.map((s, i) => (
            <View key={i} style={[styles.segment, styles[s]]} />
          ))}
        </View>
        <View style={styles.titleRow}>
          <MediaButton icon="close" label="Close lesson" onPress={onClose} testID="lesson-close" />
          <Text style={styles.heading} numberOfLines={1}>
            {heading}
          </Text>
          <MediaButton
            icon={muted ? 'volume-off' : 'volume-on'}
            label={muted ? 'Unmute narration' : 'Mute narration'}
            onPress={onToggleMute}
            testID="scene-mute"
          />
          {onTranscript && (
            <Tappable onPress={onTranscript} accessibilityRole="button" accessibilityLabel="Transcript: read this lesson as text" testID="lesson-transcript" style={styles.pill}>
              <Icon name="transcript" size={16} color={scenePalette.onScene} />
              <Text style={styles.pillLabel}>Transcript</Text>
            </Tappable>
          )}
        </View>
      </View>

      <View style={styles.captions} pointerEvents="none" aria-hidden>
        {line && (
          <Animated.Text key={caption} entering={reducedMotion ? undefined : FadeIn.duration(CAPTION_FADE_MS)} style={styles.caption} numberOfLines={2} testID="scene-caption">
            {line}
          </Animated.Text>
        )}
      </View>

      <View style={styles.bottom}>
        <MediaButton {...control} testID="scene-play" />
        <View style={styles.track}>
          <Animated.View style={[styles.fill, progressStyle]} />
        </View>
        <Text style={styles.time}>{formatClock(length - (ended ? length : second))}</Text>
        <Tappable onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip scene" testID="scene-skip" style={styles.pill}>
          <Text style={styles.pillLabel}>Skip</Text>
          <Icon name="chevron-right" size={16} color={scenePalette.onScene} />
        </Tappable>
      </View>
    </View>
  );
}

function MediaButton({ icon, label, onPress, testID }: MediaButtonProps) {
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} style={styles.iconButton}>
      <Icon name={icon} size={22} color={scenePalette.onScene} />
    </Tappable>
  );
}

/** Gradient that keeps the white controls readable on any scene. */
function Scrim({ edge, height }: { edge: 'top' | 'bottom'; height: number }) {
  const id = `scrim-${edge}`;
  return (
    <Svg pointerEvents="none" style={[styles.scrim, edge === 'top' ? styles.scrimTop : styles.scrimBottom, { height }]} width="100%" height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={edge === 'top' ? scenePalette.scrimStrong : scenePalette.scrimClear} />
          <Stop offset="1" stopColor={edge === 'top' ? scenePalette.scrimClear : scenePalette.scrimStrong} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  player: { backgroundColor: scenePalette.surface, overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, right: 0 },
  scrim: { position: 'absolute', left: 0, right: 0 },
  scrimTop: { top: 0 },
  scrimBottom: { bottom: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, gap: spacing.xs, paddingHorizontal: spacing.sm },
  segments: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.xs },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  done: { backgroundColor: scenePalette.segmentDone },
  now: { backgroundColor: scenePalette.segmentNow },
  todo: { backgroundColor: scenePalette.segmentTodo },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heading: { ...type.labelStrong, color: scenePalette.onScene, flex: 1, minWidth: 0 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: scenePalette.pressed,
  },
  pillLabel: { ...type.labelStrong, color: scenePalette.onScene },
  captions: { position: 'absolute', left: 18, right: 18, bottom: 64, alignItems: 'center' },
  caption: {
    ...type.titleCard,
    color: scenePalette.onScene,
    textAlign: 'center',
    backgroundColor: scenePalette.captionPill,
    borderRadius: radii.button,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    overflow: 'hidden',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
    paddingBottom: spacing.sm,
  },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: scenePalette.progressTrack },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: scenePalette.onScene },
  time: { ...type.labelStrong, color: scenePalette.onScene, fontVariant: ['tabular-nums'] },
});
