import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/bank/Icon';
import { IconButton } from '@/components/bank/IconButton';
import { ListCard } from '@/components/bank/ListCard';
import { CategoryChips } from '@/components/duel/CategoryChips';
import { Podium } from '@/components/duel/Podium';
import { RankingListItem } from '@/components/duel/RankingListItem';
import { SegmentedTabs } from '@/components/duel/SegmentedTabs';
import { TopWash } from '@/components/duel/TopWash';
import { WeekBanner } from '@/components/duel/WeekBanner';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { isCategorySlug } from '@/lib/duel/meta';
import { USER_ID } from '@/lib/user';
import type { CategorySlug, Rankings, RankingScope } from '@/types/duel';

const SCOPES: { value: RankingScope; label: string }[] = [
  { value: 'category', label: 'Category' },
  { value: 'overall', label: 'Overall' },
  { value: 'friends', label: 'Friends' },
  { value: 'weekly', label: 'League' },
];

const isRankingScope = (v: string | undefined): v is RankingScope => SCOPES.some((s) => s.value === v);

function rankingsPath(scope: RankingScope, category: CategorySlug) {
  const user = `userId=${encodeURIComponent(USER_ID)}`;
  return scope === 'category'
    ? `/api/duel/rankings?scope=category&category=${encodeURIComponent(category)}&${user}`
    : `/api/duel/rankings?scope=${scope}&${user}`;
}

/** Leaderboards: per category, overall, friends and the weekly league, with "you" pinned at the bottom. */
export default function DuelRankingsScreen() {
  const params = useLocalSearchParams<{ scope?: string; category?: string }>();
  const [scope, setScope] = useState<RankingScope>(isRankingScope(params.scope) ? params.scope : 'weekly');
  const [category, setCategory] = useState<CategorySlug>(isCategorySlug(params.category) ? params.category : 'instruments');
  const { data, loading, error, reload } = useApi<Rankings>(rankingsPath(scope, category));
  const weekly = scope === 'weekly';

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/duel');
  }

  return (
    <SafeAreaView style={styles.safe} testID="screen-duel-rankings">
      <StatusBar style="dark" />
      <TopWash />

      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={goBack} label="Back" testID="rankings-back" />
        <View style={styles.titleBlock}>
          <Text style={styles.subtitle}>Ranked by Elo · knowledge, never returns</Text>
          <Text style={type.displayLarge} accessibilityRole="header">
            Rankings
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <SegmentedTabs options={SCOPES} value={scope} onChange={setScope} testIDPrefix="rankings-tab" />
      </View>
      {scope === 'category' && <CategoryChips value={category} onChange={setCategory} />}

      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => {
          const top = data?.top ?? [];
          const me = data?.me ?? null;
          const podium = top.length >= 3 ? ([top[0], top[1], top[2]] as const) : null;
          const rest = podium ? top.slice(3) : top;
          return (
            <>
              <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {weekly && <WeekBanner />}
                {top.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <EmptyState
                      icon="trophy"
                      title="No one ranked yet"
                      body={
                        weekly
                          ? 'Play a human match this week to take the first spot.'
                          : 'Players appear here after 5 human matches in a category.'
                      }
                      testID="rankings-empty"
                    />
                  </View>
                ) : (
                  <>
                    {podium && <Podium top3={[...podium]} weekly={weekly} />}
                    {rest.length > 0 && (
                      <ListCard testID="rankings-list">
                        {rest.map((row) => (
                          <RankingListItem key={`${row.userId}-${row.rank}`} row={row} weekly={weekly} isYou={row.userId === USER_ID} />
                        ))}
                      </ListCard>
                    )}
                  </>
                )}
              </ScrollView>

              <View style={styles.pinnedWrap}>
                {me ? (
                  <RankingListItem row={me} weekly={weekly} isYou variant="pinned" testID="rankings-pinned-me" />
                ) : (
                  <View style={styles.unranked} testID="rankings-unranked-me">
                    <Icon name="timer" size={16} color={colors.brandPrimary} />
                    <Text style={styles.unrankedText}>
                      {weekly ? 'Play a human match this week to join the league.' : 'Finish 5 human matches in this category to get ranked.'}
                    </Text>
                  </View>
                )}
              </View>
            </>
          );
        }}
      </AsyncContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCanvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  titleBlock: { flex: 1, gap: spacing.xxs },
  subtitle: { ...type.labelDefault, color: colors.textMuted },
  tabs: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: spacing.lg },
  emptyCard: { backgroundColor: colors.bgSurface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.borderDefault },
  pinnedWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  unranked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandPrimarySoft,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  unrankedText: { ...type.bodyDefault, color: colors.brandPrimary, flex: 1 },
});
