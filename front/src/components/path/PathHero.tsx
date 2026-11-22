import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/bank/IconButton';
import { PathProgress } from '@/components/path/PathProgress';
import { StoryLandmark } from '@/components/StoryLandmark';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { StoryPage } from '@/types/stories';

type Props = {
  /** Undefined while the stories load: the hero shows its frame and the back button. */
  story?: StoryPage;
  accent: string;
  tint: string;
  onBack: () => void;
};

/** Building heights for the hero skyline, derived from the city name so every city gets its own, stable outline. */
function skyline(city: string) {
  let seed = [...city].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: 16 }, () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return 40 + (seed % 70);
  });
}

/** Top of a path's screen: the city's skyline and landmark, the path's name, and its progress. */
export function PathHero({ story, accent, tint, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const minutesLeft = story?.lessons.filter((l) => l.status !== 'done').reduce((total, l) => total + l.minutes, 0) ?? 0;

  return (
    <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + spacing.lg }]}>
      {story && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.skyline]}>
          {skyline(story.city).map((height, index) => (
            <View key={index} style={[styles.building, { height, backgroundColor: tint }]} />
          ))}
        </View>
      )}
      {story?.landmark && <StoryLandmark kind={story.landmark.kind} at={story.landmark.at} color={tint} />}
      <IconButton icon="chevron-left" label="Back to the globe" onPress={onBack} />
      <View style={styles.heading}>
        {story && <Text style={[styles.overline, { color: accent }]}>{story.city} · learning path</Text>}
        <Text accessibilityRole="header" style={styles.title}>
          {story?.area ?? story?.city ?? 'Path'}
        </Text>
        {story && <Text style={styles.subtitle}>{story.topic}</Text>}
      </View>
      {story && <PathProgress done={story.progress.done} total={story.progress.total} minutesLeft={minutesLeft} accent={accent} />}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.lg, paddingBottom: 72, gap: spacing.md, overflow: 'hidden' },
  heading: { gap: spacing.xs },
  title: type.displayHero,
  subtitle: { ...type.bodyReading, color: colors.textMuted },
  overline: type.overline,
  skyline: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  building: { flex: 1, borderTopLeftRadius: radii.bar, borderTopRightRadius: radii.bar },
});
