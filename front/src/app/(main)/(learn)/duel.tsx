import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { CategoryChip } from '@/components/duel/CategoryChip';
import { LobbyHeader } from '@/components/duel/LobbyHeader';
import { LobbyTile } from '@/components/duel/LobbyTile';
import { ModeTile } from '@/components/duel/ModeTile';
import { colors, nav, radii, spacing, type } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useApi } from '@/hooks/useApi';
import { clearStoredActiveMatch } from '@/lib/duel/useDuelMatch';
import { useCurrentUser } from '@/lib/user';
import type { DuelCategory, DuelMode, Rankings } from '@/types/duel';

/** A match takes at most this many categories (DuelMatchService.MAX_CATEGORIES). */
const MAX_CATEGORIES = 4;
const categoriesPath = (userId: string) => `/api/duel/categories?userId=${encodeURIComponent(userId)}`;
const weeklyPath = (userId: string) => `/api/duel/rankings?userId=${encodeURIComponent(userId)}`;

function getCtaText(count: number, mode: DuelMode): string {
  if (count === 0) return 'Select at least 1 category';
  const catWord = count === 1 ? '1 category' : `${count} categories`;
  return mode === 'SOLO' ? `Start solo · ${catWord}` : `Find rival · ${catWord}`;
}

/** Duel lobby (Figma v4·1 / v4·2): navy header, Ranking + History tiles, mode tiles, category chips, CTA. */
export default function DuelLobbyScreen() {
  const { userId } = useCurrentUser();
  const [mode, setMode] = useState<DuelMode>('HUMAN');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const initializedSelection = useRef(false);

  const { account } = useAccount();
  const avatar = account?.avatar ?? 'm1';
  const { data: categories, loading: catLoading, error: catError, reload: reloadCategories } = useApi<DuelCategory[]>(categoriesPath(userId));
  const { data: weekly, reload: reloadWeekly } = useApi<Rankings>(weeklyPath(userId));

  // Default selection: the first categories, up to the match limit, when first loaded
  useEffect(() => {
    if (categories && categories.length > 0 && !initializedSelection.current) {
      initializedSelection.current = true;
      setSelectedCategories(categories.slice(0, MAX_CATEGORIES).map((c) => c.story));
    }
  }, [categories]);

  // Refresh on screen focus
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      reloadCategories();
      reloadWeekly();
    }, [reloadCategories, reloadWeekly]),
  );

  function toggleCategory(story: string) {
    setSelectedCategories((prev) =>
      prev.includes(story) ? prev.filter((s) => s !== story) : prev.length < MAX_CATEGORIES ? [...prev, story] : prev,
    );
  }

  function startMatch() {
    if (selectedCategories.length === 0) return;
    clearStoredActiveMatch();
    router.push({ pathname: '/duel/match', params: { categories: selectedCategories.join(','), mode } });
  }

  const me = weekly?.me ?? null;
  const climbed = me?.previousRank != null && me.previousRank > me.rank ? me.previousRank - me.rank : 0;

  return (
    <View style={styles.screen} testID="screen-duel">
      <LobbyHeader avatar={avatar} level={me?.level ?? 1} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <LobbyTile
            title={me ? `Ranking #${me.rank}` : 'Ranking'}
            tone="accent"
            icon={<Icon name="trophy" size={24} color={colors.textOnAccent} />}
            badge={climbed > 0 ? String(climbed) : undefined}
            onPress={() => router.push('/duel/rankings')}
            testID="duel-open-rankings"
          />
          <LobbyTile
            title="History"
            tone="primary"
            icon={<Icon name="timer" size={24} color={colors.textOnBrand} />}
            onPress={() => router.push('/duel/history')}
            testID="duel-open-history"
          />
        </View>

        <Text style={styles.heading} accessibilityRole="header">
          Choose a mode
        </Text>
        <View style={styles.row} accessibilityRole="radiogroup">
          <ModeTile mode="HUMAN" selected={mode === 'HUMAN'} avatar={avatar} onPress={() => setMode('HUMAN')} />
          <ModeTile mode="SOLO" selected={mode === 'SOLO'} avatar={avatar} onPress={() => setMode('SOLO')} />
        </View>

        <View style={styles.categoriesHead}>
          <Text style={styles.heading} accessibilityRole="header">
            Categories
          </Text>
          <View style={styles.counter} testID="duel-category-counter">
            <Text style={styles.counterText}>
              {selectedCategories.length} / {MAX_CATEGORIES}
            </Text>
          </View>
        </View>
        <AsyncContent loading={catLoading} error={catError} onRetry={reloadCategories}>
          {() => (
            <View style={styles.chips} testID="duel-category-list">
              {categories?.map((cat) => (
                <CategoryChip key={cat.story} cat={cat} checked={selectedCategories.includes(cat.story)} onToggle={() => toggleCategory(cat.story)} />
              ))}
            </View>
          )}
        </AsyncContent>

        <Button
          label={getCtaText(selectedCategories.length, mode)}
          disabled={selectedCategories.length === 0}
          onPress={startMatch}
          testID="duel-start-cta"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: nav.clearance + spacing.xl },
  row: { flexDirection: 'row', gap: spacing.md },
  heading: { ...type.titleSection, color: colors.textPrimary },
  categoriesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { backgroundColor: colors.brandPrimarySoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  counterText: { ...type.labelStrong, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
