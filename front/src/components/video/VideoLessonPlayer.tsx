import { preload } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlossarySheet } from '@/components/lesson/GlossarySheet';
import { LessonEnd } from '@/components/lesson/LessonEnd';
import { LessonTopBar } from '@/components/lesson/LessonTopBar';
import { ConceptLinkContext } from '@/components/lesson/RichText';
import { StepView } from '@/components/lesson/StepView';
import { ScenePlayer, type SegmentState } from '@/components/video/ScenePlayer';
import { colors, storyColors } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import type { LessonSession } from '@/hooks/useLessonSession';
import { useSceneMuted } from '@/hooks/useSceneMuted';
import { API_URL } from '@/lib/api';
import { AMOUNTS } from '@/lib/lessonMetrics';
import { isRetry, progressShare, weakConcepts } from '@/lib/lessonPlayer';
import { resolveScene, type MetricValue } from '@/lib/sceneClock';
import type { Lesson } from '@/types/lessons';

type Props = {
  /** A lesson with a video track. */
  lesson: Lesson & { video: NonNullable<Lesson['video']> };
  session: LessonSession;
  onClose: () => void;
  onNext: (lessonId: string) => void;
  onOpenGlossary: () => void;
  /** Set on the story's last lesson: what the bank offers in the story's area. */
  onOffers?: () => void;
};

/**
 * Video form of a lesson: a scene plays full screen; a step or the end screen takes the whole screen, as in the
 * classic form, with no player above it.
 */
export function VideoLessonPlayer({ lesson, session, onClose, onNext, onOpenGlossary, onOffers }: Props) {
  const { progress, xp, complete, switchTo } = session;
  const { beats, scenes } = lesson.video;
  const { state: bank } = useBank();
  const reducedMotion = useReducedMotion();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The app column can be narrower than the window (web shows a phone-width frame): measure it.
  const [size, setSize] = useState({ width: window.width, height: window.height - insets.bottom });
  const [muted, setMuted] = useSceneMuted();
  const [concept, setConcept] = useState<string | null>(null);
  // "Watch again" on the end screen: the last scene plays once more, then the end screen returns.
  const [replay, setReplay] = useState(0);
  const [replaying, setReplaying] = useState(false);

  const byId = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes]);
  const current = progress.current;
  const currentScene = current ? byId.get(current) : undefined;
  const lastScene = useMemo(() => [...beats].reverse().find((id) => byId.has(id)), [beats, byId]);
  const shown = currentScene ?? (replaying && lastScene ? byId.get(lastScene) : undefined);

  // The user's own number for a personal scene, from the mock bank on the device (never sent to the backend).
  const metric = useCallback(
    (name: string): MetricValue => {
      const cents = AMOUNTS[name]?.(bank);
      return cents && cents > 0 ? { value: cents / 100, currency: 'EUR' } : null;
    },
    [bank],
  );
  const resolved = useMemo(() => (shown ? resolveScene(shown, progress.choices, metric) : null), [shown, progress.choices, metric]);
  const choiceKey = shown?.byChoice ? progress.choices[shown.byChoice.step] : undefined;

  const retry = isRetry(progress);
  const segments: SegmentState[] = beats.map((id) => (id === current ? 'now' : progress.done.has(id) ? 'done' : 'todo'));
  // A repeated quiz at the end lights the last segment again.
  if (retry) segments[segments.length - 1] = 'now';

  const audioUrl = (file?: string) => (file ? `${API_URL}${lesson.audioBase}${file}` : null);
  // While a step is on screen, the next scene's narration loads.
  const nextScene = current && !currentScene ? beats.slice(beats.indexOf(current) + 1).find((id) => byId.has(id)) : undefined;
  const preloadUrl = audioUrl(nextScene ? byId.get(nextScene)?.audio : undefined);
  useEffect(() => {
    if (preloadUrl) preload({ uri: preloadUrl }).catch(() => {});
  }, [preloadUrl]);

  const step = current && !currentScene ? lesson.steps.find((s) => s.id === current) : undefined;
  const weak = weakConcepts(progress, lesson.steps, lesson.concepts);
  const stopReplay = () => setReplaying(false);

  return (
    <ConceptLinkContext.Provider value={setConcept}>
      <View
        style={styles.fill}
        testID="video-lesson"
        onLayout={(e) => setSize({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })}
      >
        <StatusBar style={resolved ? 'light' : 'dark'} />
        {resolved && shown ? (
          <ScenePlayer
            // A new scene, choice, data fallback or "Watch again" mounts a fresh player.
            key={`${shown.id}-${choiceKey ?? ''}-${resolved.usedFallback}-${replay}`}
            scene={resolved}
            autoplay={currentScene ? !reducedMotion : true}
            heading={`Lesson ${lesson.position}`}
            segments={segments}
            color={storyColors[lesson.color] ?? colors.storySlate}
            landmark={lesson.landmark}
            seed={lesson.story}
            width={size.width}
            height={size.height - insets.top}
            topInset={insets.top}
            audioUrl={audioUrl(resolved.audio)}
            muted={muted}
            onToggleMute={() => setMuted(!muted)}
            onTranscript={currentScene ? () => switchTo('classic') : undefined}
            onClose={currentScene ? onClose : stopReplay}
            onSkip={currentScene ? () => complete(currentScene.id) : stopReplay}
            onEnded={currentScene ? () => complete(currentScene.id) : stopReplay}
            reducedMotion={reducedMotion}
          />
        ) : (
          // The player reaches under the status bar; everything else starts below it.
          <View style={[styles.fill, { paddingTop: insets.top }]}>
            <LessonTopBar progress={progressShare(progress, lesson)} onClose={onClose} />
            {step ? (
              // Keyed by turn: a repeated step mounts fresh (reset, reshuffled).
              <View key={`${step.id}-${progress.turn}`} style={styles.fill}>
                <StepView step={step} retry={retry} onDone={(outcome) => complete(step.id, outcome)} />
              </View>
            ) : (
              <LessonEnd
                title={lesson.title}
                xp={xp}
                concepts={lesson.concepts.map((key) => ({ key, term: lesson.glossary[key]?.term ?? key, weak: weak.has(key) }))}
                onConcept={setConcept}
                onNext={lesson.next ? () => onNext(lesson.next!) : undefined}
                onOffers={onOffers}
                onClose={onClose}
                onWatchAgain={
                  lastScene
                    ? () => {
                        setReplay((r) => r + 1);
                        setReplaying(true);
                      }
                    : undefined
                }
              />
            )}
          </View>
        )}

        <GlossarySheet
          entry={concept ? lesson.glossary[concept] : undefined}
          onClose={() => setConcept(null)}
          onMore={() => {
            setConcept(null);
            onOpenGlossary();
          }}
        />
      </View>
    </ConceptLinkContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bgCanvas },
});
