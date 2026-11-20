import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { BankScreen } from '@/components/bank/BankScreen';
import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { Section } from '@/components/bank/Section';
import { LeagueCard } from '@/components/duel/LeagueCard';
import { ModeCard } from '@/components/duel/ModeCard';
import { StatusChip } from '@/components/duel/DuelUi';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { categoryIconName, formatNumber, getCategoryMeta } from '@/lib/duel/meta';
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

/** Duel lobby, the "Duel" tab of the Finance Quest nav: league status, mode, category. */
export default function DuelLobbyScreen() {
  const [mode, setMode] = useState<DuelMode>('HUMAN');
  const { data: categories, loading, error, reload: reloadCategories } = useApi<DuelCategory[]>(CATEGORIES_PATH);
  const { data: weekly, reload: reloadWeekly } = useApi<Rankings>(WEEKLY_PATH);

  // Refresh the lobby whenever the user returns from a finished match.
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

  const totalXp = categories?.reduce((sum, c) => sum + c.xp, 0) ?? 0;
  const me = weekly?.me ?? null;

  function startMatch(cat: DuelCategory) {
    clearStoredActiveMatch();
    router.push({
      pathname: '/duel/match',
      params: { category: cat.slug, mode, elo: String(cat.elo), calibrated: cat.calibrated ? '1' : '0' },
    });
  }

  return (
    <BankScreen testID="screen-duel">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.subtitle}>{me?.name ? `Hi ${me.name} · 1v1 knowledge duels` : '1v1 knowledge duels'}</Text>
          <Text style={type.displayLarge} accessibilityRole="header">
            Ready to duel?
          </Text>
        </View>
        <StatusChip label={`${formatNumber(totalXp)} XP`} tone="xp" icon="zap" />
      </View>

      <LeagueCard me={me} onOpenRankings={() => router.push({ pathname: '/duel/rankings', params: { scope: 'weekly' } })} />

      <Section title="Choose a mode">
        <View style={styles.modes}>
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
              {categories?.map((cat) => (
                <CategoryRow key={cat.slug} cat={cat} onPress={() => startMatch(cat)} />
              ))}
            </ListCard>
          )}
        </AsyncContent>
      </Section>
    </BankScreen>
  );
}

function CategoryRow({ cat, onPress }: { cat: DuelCategory; onPress: () => void }) {
  const meta = getCategoryMeta(cat.slug);
  const xpRatio = cat.xpForLevel > 0 ? Math.min(1, Math.max(0.06, cat.xpIntoLevel / cat.xpForLevel)) : 0.06;
  return (
    <ListRow
      testID={`duel-category-${cat.slug}`}
      icon={categoryIconName(cat.icon)}
      tile={{ background: meta.tint, color: meta.accent }}
      title={cat.name}
      meta={
        <View style={styles.level}>
          <Text style={styles.levelLabel}>Lv {cat.level}</Text>
          <View style={styles.levelTrack}>
            <View style={[styles.levelFill, { width: `${Math.round(xpRatio * 100)}%` }]} />
          </View>
        </View>
      }
      value={cat.calibrated ? formatNumber(cat.elo) : `${Math.min(cat.humanMatches, 5)}/5`}
      valueTone={cat.calibrated ? 'default' : 'muted'}
      valueNote={cat.calibrated ? 'Elo' : 'Calibrating'}
      chevron
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  subtitle: { ...type.bodyDefault, color: colors.textMuted },
  modes: { flexDirection: 'row', gap: spacing.sm },
  level: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelLabel: { ...type.labelStrong, color: colors.feedbackXp },
  levelTrack: { width: 68, height: 5, borderRadius: radii.bar, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandAccent },
});
