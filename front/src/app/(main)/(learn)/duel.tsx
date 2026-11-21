import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Button } from '@/components/Button';
import { BankScreen } from '@/components/bank/BankScreen';
import { ListCard } from '@/components/bank/ListCard';
import { Section } from '@/components/bank/Section';
import { CategoryRow } from '@/components/duel/CategoryRow';
import { LeagueCard } from '@/components/duel/LeagueCard';
import { LobbyHeader } from '@/components/duel/LobbyHeader';
import { MatchRow } from '@/components/duel/MatchRow';
import { ModeToggle } from '@/components/duel/ModeToggle';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useApi } from '@/hooks/useApi';
import { clearStoredActiveMatch } from '@/lib/duel/useDuelMatch';
import { USER_ID } from '@/lib/user';
import type { DuelCategory, DuelMode, MatchSummary, Rankings } from '@/types/duel';

const CATEGORIES_PATH = `/api/duel/categories?userId=${encodeURIComponent(USER_ID)}`;
const WEEKLY_PATH = `/api/duel/rankings?userId=${encodeURIComponent(USER_ID)}`;
const MATCHES_PATH = `/api/duel/matches?userId=${encodeURIComponent(USER_ID)}`;

function getCtaText(count: number, mode: DuelMode): string {
  if (count === 0) return 'Wybierz co najmniej 1 kategorię';
  const catWord = count === 1 ? '1 kategoria' : count < 5 ? `${count} kategorie` : `${count} kategorii`;
  if (mode === 'SOLO') {
    return `Rozpocznij solo · ${catWord}`;
  }
  return `Szukaj rywala · ${catWord}`;
}

export default function DuelLobbyScreen() {
  const [activeTab, setActiveTab] = useState<'play' | 'history'>('play');
  const [mode, setMode] = useState<DuelMode>('HUMAN');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const initializedSelection = useRef(false);

  const { account, stats } = useAccount();
  const { data: categories, loading: catLoading, error: catError, reload: reloadCategories } = useApi<DuelCategory[]>(CATEGORIES_PATH);
  const { data: weekly, reload: reloadWeekly } = useApi<Rankings>(WEEKLY_PATH);
  const { data: matches, loading: matchLoading, error: matchError, reload: reloadMatches } = useApi<MatchSummary[]>(MATCHES_PATH);

  // Default selection: all categories when first loaded
  useEffect(() => {
    if (categories && categories.length > 0 && !initializedSelection.current) {
      initializedSelection.current = true;
      setSelectedCategories(categories.map((c) => c.story));
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
      reloadMatches();
    }, [reloadCategories, reloadWeekly, reloadMatches]),
  );

  function toggleCategory(story: string) {
    setSelectedCategories((prev) =>
      prev.includes(story) ? prev.filter((s) => s !== story) : [...prev, story],
    );
  }

  function startMatch() {
    if (selectedCategories.length === 0) return;
    clearStoredActiveMatch();
    router.push({
      pathname: '/duel/match',
      params: {
        categories: selectedCategories.join(','),
        mode,
      },
    });
  }

  function openMatch(match: MatchSummary) {
    clearStoredActiveMatch();
    router.push({
      pathname: '/duel/match',
      params: {
        matchId: String(match.matchId),
        mode: match.mode,
      },
    });
  }

  const unfinishedMatches = matches?.filter((m) => m.status === 'PLAYING' || m.status === 'RIVAL_PLAYING') ?? [];
  const finishedMatches = matches?.filter((m) => m.status === 'FINISHED') ?? [];

  return (
    <BankScreen testID="screen-duel">
      <LobbyHeader
        firstName={account?.firstName}
        streak={stats?.currentStreak ?? 0}
        xp={stats?.totalXp ?? 0}
      />

      {/* Tabs: Graj | Historia */}
      <View style={styles.tabBar} accessibilityRole="tablist">
        <Tappable
          onPress={() => setActiveTab('play')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'play' }}
          accessibilityLabel="Graj"
          testID="duel-tab-play"
          style={[styles.tab, activeTab === 'play' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'play' && styles.activeTabText]}>Graj</Text>
        </Tappable>

        <Tappable
          onPress={() => setActiveTab('history')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'history' }}
          accessibilityLabel="Historia"
          testID="duel-tab-history"
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Historia</Text>
        </Tappable>
      </View>

      {activeTab === 'play' ? (
        <View style={styles.tabContent}>
          {/* Weekly League Hero */}
          <LeagueCard
            avatar={account?.avatar ?? 'm1'}
            me={weekly?.me ?? null}
            onOpenRankings={() => router.push('/duel/rankings')}
          />

          {/* Mode Toggle: Z rywalem | Solo */}
          <Section title="Wybierz tryb">
            <ModeToggle mode={mode} onChange={setMode} />
          </Section>

          {/* Category List with Checkboxes */}
          <Section title="Wybierz kategorie pytań">
            <AsyncContent loading={catLoading} error={catError} onRetry={reloadCategories}>
              {() => (
                <ListCard testID="duel-category-list">
                  {categories?.map((cat) => (
                    <CategoryRow
                      key={cat.story}
                      cat={cat}
                      checked={selectedCategories.includes(cat.story)}
                      onToggle={() => toggleCategory(cat.story)}
                    />
                  ))}
                </ListCard>
              )}
            </AsyncContent>
          </Section>

          {/* Yellow CTA Button */}
          <View style={styles.ctaWrap}>
            <Button
              label={getCtaText(selectedCategories.length, mode)}
              disabled={selectedCategories.length === 0}
              onPress={startMatch}
              testID="duel-start-cta"
            />
          </View>
        </View>
      ) : (
        <View style={styles.tabContent}>
          <AsyncContent loading={matchLoading} error={matchError} onRetry={reloadMatches}>
            {() => (
              <>
                {unfinishedMatches.length > 0 && (
                  <Section title="W toku">
                    <ListCard testID="duel-history-pending">
                      {unfinishedMatches.map((m) => (
                        <MatchRow key={m.matchId} match={m} onPress={() => openMatch(m)} />
                      ))}
                    </ListCard>
                  </Section>
                )}

                <Section title="Zakończone">
                  {finishedMatches.length > 0 ? (
                    <ListCard testID="duel-history-finished">
                      {finishedMatches.map((m) => (
                        <MatchRow key={m.matchId} match={m} onPress={() => openMatch(m)} />
                      ))}
                    </ListCard>
                  ) : (
                    <View style={styles.emptyHistory} testID="history-empty">
                      <Text style={styles.emptyHistoryText}>Brak zakończonych pojedynków</Text>
                    </View>
                  )}
                </Section>
              </>
            )}
          </AsyncContent>
        </View>
      )}
    </BankScreen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xxs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.button - 2,
  },
  activeTab: {
    backgroundColor: colors.brandPrimary,
  },
  tabText: {
    ...type.labelStrong,
    color: colors.textPrimary,
  },
  activeTabText: {
    color: colors.textOnBrand,
  },
  tabContent: {
    gap: spacing.lg,
  },
  ctaWrap: {
    paddingVertical: spacing.sm,
  },
  emptyHistory: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  emptyHistoryText: {
    ...type.bodyDefault,
    color: colors.textMuted,
  },
});
