import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { BankScreen } from '@/components/bank/BankScreen';
import { ListCard } from '@/components/bank/ListCard';
import { Section } from '@/components/bank/Section';
import { CategoryRow } from '@/components/duel/CategoryRow';
import { LeagueCard } from '@/components/duel/LeagueCard';
import { LobbyHeader } from '@/components/duel/LobbyHeader';
import { ModeCard } from '@/components/duel/ModeCard';
import { spacing } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useApi } from '@/hooks/useApi';
import { clearStoredActiveMatch } from '@/lib/duel/useDuelMatch';
import { USER_ID } from '@/lib/user';
import type { BankIconName } from '@/types/bank';
import type { DuelCategory, DuelMode, Rankings } from '@/types/duel';

const MODE_OPTIONS: { mode: DuelMode; title: string; subtitle: string; icon: BankIconName }[] = [
  { mode: 'HUMAN', title: 'Vs human', subtitle: 'Ranked · Elo', icon: 'users' },
  { mode: 'BOT', title: 'Vs bot', subtitle: 'Practice · XP', icon: 'bot' },
  { mode: 'SOLO', title: 'Solo', subtitle: 'Just you · XP', icon: 'target' },
];

const CATEGORIES_PATH = `/api/duel/categories?userId=${encodeURIComponent(USER_ID)}&lang=en`;
const WEEKLY_PATH = `/api/duel/rankings?scope=weekly&userId=${encodeURIComponent(USER_ID)}`;

/** Duel lobby, the "Duel" tab of the Atlas nav: league status, mode, category. */
export default function DuelLobbyScreen() {
  const [mode, setMode] = useState<DuelMode>('HUMAN');
  const { account, stats } = useAccount();
  const { data: categories, loading, error, reload: reloadCategories } = useApi<DuelCategory[]>(CATEGORIES_PATH);
  const { data: weekly, reload: reloadWeekly } = useApi<Rankings>(WEEKLY_PATH);

  // Refresh the lobby whenever the user comes back from a finished match.
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

  function startMatch(cat: DuelCategory) {
    clearStoredActiveMatch();
    router.push({
      pathname: '/duel/match',
      params: { category: cat.slug, mode, elo: String(cat.elo), calibrated: cat.calibrated ? '1' : '0' },
    });
  }

  return (
    <BankScreen testID="screen-duel">
      <LobbyHeader firstName={account?.firstName} streak={stats?.currentStreak ?? 0} xp={stats?.totalXp ?? 0} />

      <LeagueCard
        avatar={account?.avatar ?? 'm1'}
        me={weekly?.me ?? null}
        onOpenRankings={() => router.push({ pathname: '/duel/rankings', params: { scope: 'weekly' } })}
      />

      <Section title="Choose a mode">
        <View style={styles.modes} accessibilityRole="radiogroup">
          {MODE_OPTIONS.map((opt) => (
            <ModeCard
              key={opt.mode}
              testID={`duel-mode-${opt.mode.toLowerCase()}`}
              icon={opt.icon}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={mode === opt.mode}
              onPress={() => setMode(opt.mode)}
            />
          ))}
        </View>
      </Section>

      <Section title="Pick a category">
        <AsyncContent loading={loading} error={error} onRetry={reloadCategories}>
          {() => (
            <ListCard testID="duel-category-list">
              {categories?.map((cat) => <CategoryRow key={cat.slug} cat={cat} onPress={() => startMatch(cat)} />)}
            </ListCard>
          )}
        </AsyncContent>
      </Section>
    </BankScreen>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: spacing.sm },
});
