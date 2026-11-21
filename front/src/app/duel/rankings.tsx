import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/bank/IconButton';
import { ListCard } from '@/components/bank/ListCard';
import { RankingListItem } from '@/components/duel/RankingListItem';
import { colors, elevation, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { USER_ID } from '@/lib/user';
import type { Rankings } from '@/types/duel';

const RANKINGS_PATH = `/api/duel/rankings?userId=${encodeURIComponent(USER_ID)}`;

/** Weekly overall rankings (Figma 157:4663). Overall weekly only, navy header. */
export default function DuelRankingsScreen() {
  const { data, loading, error, reload } = useApi<Rankings>(RANKINGS_PATH);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/duel');
  }

  return (
    <SafeAreaView style={styles.safe} testID="screen-duel-rankings">
      <StatusBar style="light" />

      {/* Navy Header */}
      <View style={styles.navyHeader}>
        <View style={styles.headerTop}>
          <IconButton icon="chevron-left" onPress={goBack} label="Back" testID="rankings-back" />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.subtitle}>Weekly Ranking · Financial Knowledge</Text>
          <Text style={styles.title} accessibilityRole="header">
            League Table
          </Text>
        </View>
      </View>

      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => {
          const top = data?.top ?? [];
          const me = data?.me ?? null;

          return (
            <View style={styles.content}>
              <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
              >
                {top.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <EmptyState
                      icon="trophy"
                      title="No players this week"
                      body="Play a duel with a rival to take the lead in the league."
                      testID="rankings-empty"
                    />
                  </View>
                ) : (
                  <ListCard testID="rankings-list">
                    {top.map((row) => (
                      <RankingListItem
                        key={`${row.userId}-${row.rank}`}
                        row={row}
                        isYou={row.userId === USER_ID}
                      />
                    ))}
                  </ListCard>
                )}
              </ScrollView>

              {/* Highlighted current user row pinned at bottom */}
              {me && (
                <View style={styles.pinnedWrap}>
                  <RankingListItem
                    row={me}
                    isYou
                    variant="pinned"
                    testID="rankings-pinned-me"
                  />
                </View>
              )}
            </View>
          );
        }}
      </AsyncContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  navyHeader: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  subtitle: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
  },
  title: {
    ...type.displayLarge,
    color: colors.textOnBrand,
  },
  content: {
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  emptyCard: {
    paddingTop: spacing.xxl,
  },
  pinnedWrap: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    ...elevation.high,
  },
});
