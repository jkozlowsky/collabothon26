import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { LevelUpOverlay } from '@/components/duel/LevelUpOverlay';
import { ReviewCard } from '@/components/duel/ReviewCard';
import { ResultHeader, type ResultOutcome } from '@/components/duel/result/ResultHeader';
import { barsEndMs, PracticeCard, XpCard } from '@/components/duel/result/XpCard';
import { Finale, HeaderFx, ScreenShower } from '@/components/duel/result/WinFx';
import { Tappable } from '@/components/onboarding/ui';
import { colors, spacing, type } from '@/constants/theme';
import { haptic, playSound } from '@/lib/duel/feedback';
import { formatPlayerName } from '@/lib/duel/meta';
import type { AvatarId } from '@/types/account';
import type { CategoryMatchEnd, DotResult, MatchEnd } from '@/types/duel';

type Props = {
  result: MatchEnd;
  youName?: string;
  youAvatar?: AvatarId;
  onPlayAgain?: () => void;
  onSeeRankings?: () => void;
  onBackToLobby: () => void;
};

/** When things start after the screen opens (ms); see the dopamine script in the plan. */
const WIN_BARS_START = 1600;
const DRAW_BARS_START = 700;
/** The level-up overlay opens this long after the last bar is full: time for the "Level up!" chip to be read. */
const OVERLAY_GAP_MS = 800;

function normalizeCategories(
  categories: (CategoryMatchEnd | string)[] | undefined,
  xpByCategory: Record<string, number> | undefined
): CategoryMatchEnd[] {
  if (!categories || categories.length === 0) {
    if (!xpByCategory) return [];
    return Object.entries(xpByCategory).map(([story, xp]) => fromGain(story, xp));
  }
  return categories.map((cat) => (typeof cat === 'string' ? fromGain(cat, xpByCategory?.[cat] ?? 0) : cat));
}

function fromGain(story: string, gained: number): CategoryMatchEnd {
  return { story, xpGained: gained, xpBefore: 0, xpAfter: gained, levelBefore: 1, levelAfter: 1, xpIntoLevelAfter: gained, xpForLevelAfter: 100 };
}

/** The rival has no per-question record, so its dots are the first `rivalScore` right and the rest wrong. */
function rivalDots(rivalScore: number): DotResult[] {
  return Array.from({ length: 6 }, (_, i) => i < rivalScore);
}

/** Result and review screen (Figma v3 frames 7–12: nodes 166:7608 / 166:8955 / 166:7903 / 166:8085 / 166:9388). */
export function ResultView({ result, youName, youAvatar, onSeeRankings, onBackToLobby }: Props) {
  const reduced = useReducedMotion();
  const instant = reduced || process.env.NODE_ENV === 'test';

  const solo = result.mode === 'SOLO' || result.outcome === 'SOLO';
  const outcome: ResultOutcome = solo ? 'SOLO' : result.outcome === 'WIN' || result.outcome === 'LOSS' ? result.outcome : 'DRAW';
  const total = result.review.length || 6;
  // D14: solo is celebrated by score. 100 % gets the full win show, 60 % and up confetti only.
  const soloRatio = solo && total > 0 ? result.score / total : 0;
  const soloTier = soloRatio >= 1 ? 'full' : soloRatio >= 0.6 ? 'good' : 'low';
  const win = outcome === 'WIN' || (solo && soloTier === 'full');
  const confettiOnly = solo && soloTier === 'good';
  const soloXp = solo && result.xpGained > 0;

  const categories = normalizeCategories(result.categories, result.xpByCategory);
  const levelUps = categories.filter((c) => c.levelAfter > c.levelBefore);
  const barsStart = win ? WIN_BARS_START : DRAW_BARS_START;
  const barsEnd = barsEndMs(barsStart, categories.length);

  // The overlay waits for the bars and the "Level up!" chip; tests and reduced motion open it at once.
  const [overlayOpen, setOverlayOpen] = useState(instant);
  const [overlayDone, setOverlayDone] = useState(false);
  const [finale, setFinale] = useState(false);

  useEffect(() => {
    if (win) {
      playSound('win');
      haptic('success');
    }
  }, [win]);

  useEffect(() => {
    if (instant) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (win && categories.length > 0) timers.push(setTimeout(() => setFinale(true), barsEnd));
    if (levelUps.length > 0) timers.push(setTimeout(() => setOverlayOpen(true), barsEnd + OVERLAY_GAP_MS));
    return () => timers.forEach(clearTimeout);
    // Timing is fixed by the data that arrived with the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant, win, barsEnd, levelUps.length]);

  const onXpDone = useCallback(() => haptic('light'), []);

  const youDisplay = formatPlayerName(
    result.you?.name && result.you.name.includes(' ') ? result.you.name : (youName ?? result.you?.name ?? 'Alex')
  );
  const rivalDisplay = formatPlayerName(result.rival?.name ?? 'Ola');
  const youDots: DotResult[] = result.review.map((r) => r.correct);
  while (youDots.length < 6) youDots.push(null);

  return (
    <View style={styles.root} testID="duel-result">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ResultHeader
          outcome={outcome}
          you={{ name: youDisplay, avatar: youAvatar ?? result.you.avatar, dots: youDots }}
          rival={solo ? undefined : { name: rivalDisplay, avatar: result.rival?.avatar, isBot: !result.rival, dots: rivalDots(result.rivalScore ?? 0) }}
          score={result.score}
          rivalScore={result.rivalScore ?? 0}
          total={total}
          xpGained={result.xpGained}
          soloTier={soloTier}
          overlay={win && !reduced ? <HeaderFx /> : null}
          onXpDone={onXpDone}
        />

        <View style={styles.content}>
          {solo && !soloXp ? (
            <PracticeCard />
          ) : (
            <XpCard
              xpGained={result.xpGained}
              correct={result.score}
              categories={categories}
              barsStartMs={barsStart}
              countStartMs={win ? 1000 : 500}
              onCountDone={onXpDone}
            />
          )}

          <ReviewCard review={result.review} />

          <View style={styles.actions}>
            <Button label="Back to arena" onPress={onBackToLobby} testID="result-back-lobby" />
            {onSeeRankings && !solo && (
              <Tappable
                onPress={onSeeRankings}
                style={styles.link}
                testID="result-see-rankings"
                accessibilityRole="button"
                accessibilityLabel="See ranking"
              >
                <Text style={styles.linkText}>See ranking</Text>
              </Tappable>
            )}
          </View>
        </View>
      </ScrollView>

      {(win || confettiOnly) && !reduced && <ScreenShower />}
      {finale && <Finale at={{ x: 0.5, y: 0.55 }} />}

      {overlayOpen && !overlayDone && levelUps.length > 0 && (
        <LevelUpOverlay categories={levelUps} onDismiss={() => setOverlayDone(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgCanvas },
  scroll: { paddingBottom: spacing.xxl },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.xl },
  actions: { gap: spacing.xs },
  link: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  linkText: { ...type.labelStrong, color: colors.brandPrimary },
});
