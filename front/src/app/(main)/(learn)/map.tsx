import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Globe, type GlobeHandle } from '@/components/globe/Globe';
import { GlobeHint } from '@/components/globe/GlobeHint';
import { LearnHeader } from '@/components/LearnHeader';
import { StorySheet } from '@/components/StorySheet';
import { colors, spacing } from '@/constants/theme';
import { LEARNER, STORIES } from '@/lib/stories';

/** Map tab (Figma 3:496): header, the globe with story pins, and the "Your stories" sheet. */
export default function MapScreen() {
  const globe = useRef<GlobeHandle>(null);
  // Estimates until the first layout pass measures the real values.
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  const [sheetTop, setSheetTop] = useState(Math.round(window.height * 0.66));
  const [hint, setHint] = useState(true);

  const openStory = (id: string) => router.push({ pathname: '/story/[id]', params: { id } });

  return (
    <View style={styles.screen} testID="screen-learn" onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <SafeAreaView edges={['top', 'left', 'right']} onLayout={(e) => setSheetTop(e.nativeEvent.layout.height + spacing.md)}>
        <LearnHeader learner={LEARNER} />
        <Globe ref={globe} stories={STORIES} onOpenStory={openStory} onSpin={() => setHint(false)} />
        {/* Keeps its space when hidden, so the sheet does not jump. */}
        <View style={!hint && styles.hidden}>
          <GlobeHint />
        </View>
      </SafeAreaView>
      <StorySheet stories={STORIES} height={height} collapsedTop={sheetTop} onSelect={(id) => globe.current?.flyTo(id)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  hidden: { opacity: 0 },
});
