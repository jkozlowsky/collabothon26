import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { IconButton } from '@/components/bank/IconButton';
import { Section } from '@/components/bank/Section';
import { MatchRow } from '@/components/duel/MatchRow';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { summarizeMatches } from '@/lib/duel/history';
import { clearStoredActiveMatch } from '@/lib/duel/useDuelMatch';
import { useCurrentUser } from '@/lib/user';
import type { MatchSummary } from '@/types/duel';

const matchesPath = (userId: string) => `/api/duel/matches?userId=${encodeURIComponent(userId)}`;

function openMatch(match: MatchSummary) {
  clearStoredActiveMatch();
  router.push({ pathname: '/duel/match', params: { matchId: String(match.matchId), mode: match.mode } });
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/duel');
}

function Stat({ label, tone, testID }: { label: string; tone: 'win' | 'loss' | 'draw'; testID: string }) {
  const palette = {
    win: { bg: colors.feedbackSuccessSoft, fg: colors.feedbackSuccess },
    loss: { bg: colors.feedbackDangerSoft, fg: colors.feedbackDanger },
    draw: { bg: colors.storySlateSoft, fg: colors.textMuted },
  }[tone];
  return (
    <View style={[styles.stat, { backgroundColor: palette.bg }]} testID={testID}>
      <Text style={[styles.statText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

/** Duel history (Figma v4·3): W / L / D chips, "In progress" and "Finished" lists. */
export default function DuelHistoryScreen() {
  const { userId } = useCurrentUser();
  const { data: matches, loading, error, reload } = useApi<MatchSummary[]>(matchesPath(userId));
  const pending = matches?.filter((m) => m.status === 'PLAYING' || m.status === 'RIVAL_PLAYING') ?? [];
  const finished = matches?.filter((m) => m.status === 'FINISHED') ?? [];
  const record = summarizeMatches(finished);

  return (
    <SafeAreaView style={styles.safe} testID="screen-duel-history">
      <StatusBar style="light" />
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={goBack} label="Back" testID="history-back" />
        <Text style={styles.title} accessibilityRole="header">
          History
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AsyncContent loading={loading} error={error} onRetry={reload}>
          {() => (
            <>
              <View style={styles.stats}>
                <Stat label={`W ${record.wins}`} tone="win" testID="history-wins" />
                <Stat label={`L ${record.losses}`} tone="loss" testID="history-losses" />
                <Stat label={`D ${record.draws}`} tone="draw" testID="history-draws" />
              </View>

              {pending.length > 0 && (
                <Section title="In progress">
                  <View style={styles.list} testID="duel-history-pending">
                    {pending.map((m) => (
                      <MatchRow key={m.matchId} match={m} onPress={() => openMatch(m)} />
                    ))}
                  </View>
                </Section>
              )}

              <Section title="Finished">
                {finished.length > 0 ? (
                  <View style={styles.list} testID="duel-history-finished">
                    {finished.map((m) => (
                      <MatchRow key={m.matchId} match={m} onPress={() => openMatch(m)} />
                    ))}
                  </View>
                ) : (
                  <View style={styles.empty} testID="history-empty">
                    <Text style={styles.emptyText}>No finished duels yet</Text>
                  </View>
                )}
              </Section>
            </>
          )}
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCanvas },
  header: { backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.md },
  title: { ...type.displayLarge, color: colors.textOnBrand },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  statText: { ...type.labelStrong },
  list: { gap: spacing.sm },
  empty: { padding: spacing.xl, alignItems: 'center', backgroundColor: colors.bgSurface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.borderDefault },
  emptyText: { ...type.bodyDefault, color: colors.textMuted },
});
