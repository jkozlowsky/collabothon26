import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { Icon } from '@/components/bank/Icon';
import { IconButton } from '@/components/bank/IconButton';
import { ListCard } from '@/components/bank/ListCard';
import { LightTopGradient } from '@/components/duel/DuelGradient';
import { ExplorerAvatar } from '@/components/duel/ExplorerAvatar';
import { colors, elevation, fonts, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import {
  CATEGORY_LIST,
  formatNumber,
  formatSigned,
  getWeeklyLeagueClock,
  isCategorySlug,
} from '@/lib/duel/meta';
import { USER_ID } from '@/lib/user';
import type { CategorySlug, RankingRow, Rankings, RankingScope } from '@/types/duel';

const SEGMENTS: { scope: RankingScope; label: string }[] = [
  { scope: 'category', label: 'Category' },
  { scope: 'overall', label: 'Overall' },
  { scope: 'friends', label: 'Friends' },
  { scope: 'weekly', label: 'League' },
];

function isRankingScope(value: string | undefined): value is RankingScope {
  return value === 'category' || value === 'overall' || value === 'friends' || value === 'weekly';
}

export default function DuelRankingsScreen() {
  const params = useLocalSearchParams<{ scope?: string; category?: string }>();
  const [scope, setScope] = useState<RankingScope>(
    isRankingScope(params.scope) ? params.scope : 'weekly',
  );
  const [category, setCategory] = useState<CategorySlug>(
    isCategorySlug(params.category) ? params.category : 'instruments',
  );

  const query =
    scope === 'category'
      ? `/api/duel/rankings?scope=category&category=${encodeURIComponent(category)}&userId=${encodeURIComponent(USER_ID)}`
      : `/api/duel/rankings?scope=${scope}&userId=${encodeURIComponent(USER_ID)}`;

  const { data, loading, error, reload } = useApi<Rankings>(query);
  const leagueClock = getWeeklyLeagueClock();
  const isWeekly = scope === 'weekly';

  function formatRowValue(value: number) {
    return isWeekly ? formatSigned(value) : formatNumber(value);
  }

  function valueColorStyle(value: number) {
    if (!isWeekly) return styles.valuePrimary;
    if (value > 0) return styles.valueGreen;
    if (value < 0) return styles.valueDanger;
    return styles.valueMuted;
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/duel');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="screen-duel-rankings">
      <StatusBar style="dark" />
      <LightTopGradient />

      <View style={styles.topHeader}>
        <IconButton
          icon="chevron-left"
          onPress={goBack}
          label="Back"
          testID="rankings-back"
        />
        <View style={styles.titleBlock}>
          <Text style={styles.subtitle}>Ranked by Elo · knowledge, never returns</Text>
          <Text style={type.displayLarge} accessibilityRole="header">
            Rankings
          </Text>
        </View>
      </View>

      {/* 4-segment switcher */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentBar} accessibilityRole="tablist">
          {SEGMENTS.map((seg) => {
            const active = scope === seg.scope;
            return (
              <Pressable
                key={seg.scope}
                testID={`rankings-tab-${seg.scope}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setScope(seg.scope)}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {seg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Category picker strip when viewing per-category rankings */}
      {scope === 'category' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
          style={styles.categoryChipsScroll}
        >
          {CATEGORY_LIST.map((cat) => {
            const selected = cat.slug === category;
            return (
              <Pressable
                key={cat.slug}
                testID={`rankings-cat-${cat.slug}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCategory(cat.slug)}
                style={[styles.catChip, selected && styles.catChipSelected]}
              >
                <Icon
                  name={cat.icon}
                  size={14}
                  color={selected ? colors.brandPrimary : cat.accent}
                />
                <Text style={[styles.catChipText, selected && styles.catChipTextSelected]}>
                  {cat.shortName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => {
          const top = data?.top ?? [];
          const me = data?.me ?? null;
          const podium = top.length >= 3 ? top.slice(0, 3) : [];
          const rest = top.length >= 3 ? top.slice(3) : top;

          return (
            <>
              <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
              >
                {isWeekly && (
                  <View style={styles.leagueBanner} testID="rankings-weekly-banner">
                    <View style={styles.leagueBannerIcon}>
                      <Icon name="trophy" size={20} color={colors.brandPrimary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={type.titleCard}>
                        Week {leagueClock.week} · ends in {leagueClock.shortLabel}
                      </Text>
                      <Text style={[type.bodyDefault, { color: colors.textMuted }]}>
                        Elo gained since Monday, all categories
                      </Text>
                    </View>
                  </View>
                )}

                {top.length === 0 ? (
                  <View style={[styles.emptyCard, elevation.low]} testID="rankings-empty">
                    <Icon name="trophy" size={28} color={colors.textMuted} />
                    <Text style={type.titleCard}>No players ranked yet</Text>
                    <Text style={[type.bodyDefault, styles.emptyText]}>
                      {isWeekly
                        ? 'Play a human match this week to claim the top spot.'
                        : 'Complete 5 human matches in a category to appear in the leaderboard.'}
                    </Text>
                  </View>
                ) : (
                  <>
                    {podium.length === 3 && (
                      <Podium
                        first={podium[0]}
                        second={podium[1]}
                        third={podium[2]}
                        isWeekly={isWeekly}
                        formatValue={formatRowValue}
                      />
                    )}

                    {rest.length > 0 && (
                      <ListCard testID="rankings-list">
                        {rest.map((row) => (
                          <RankingListRow
                            key={`${row.userId}-${row.rank}`}
                            row={row}
                            isWeekly={isWeekly}
                            formatValue={formatRowValue}
                            isCurrentUser={row.userId === USER_ID}
                          />
                        ))}
                      </ListCard>
                    )}
                  </>
                )}
              </ScrollView>

              {/* Pinned "you" row at the bottom */}
              <View style={styles.pinnedWrap}>
                {me ? (
                  <View style={styles.pinnedCard} testID="rankings-pinned-me">
                    <Text style={styles.pinnedRank}>{me.rank}</Text>
                    <ExplorerAvatar rank={me.avatar} size={40} ringColor={colors.storyTeal} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={type.titleCard} numberOfLines={1}>
                        {me.name} (you)
                      </Text>
                      <Text style={[type.labelDefault, { color: colors.textMuted }]}>
                        Lv {me.level} · {formatNumber(me.elo)} Elo
                      </Text>
                    </View>
                    <Text style={[styles.rowValue, valueColorStyle(me.value)]}>
                      {formatRowValue(me.value)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pinnedUnranked} testID="rankings-unranked-me">
                    <Icon name="timer" size={16} color={colors.brandPrimary} />
                    <Text style={[type.bodyDefault, { color: colors.brandPrimary, flex: 1 }]}>
                      {isWeekly
                        ? 'Play a human match this week to join the league.'
                        : 'Finish 5 human matches in this category to get ranked.'}
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

function Podium({
  first,
  second,
  third,
  isWeekly,
  formatValue,
}: {
  first: RankingRow;
  second: RankingRow;
  third: RankingRow;
  isWeekly: boolean;
  formatValue: (v: number) => string;
}) {
  return (
    <View style={styles.podiumRow} testID="rankings-podium">
      <PodiumColumn row={second} place={2} isWeekly={isWeekly} formatValue={formatValue} />
      <PodiumColumn row={first} place={1} isWeekly={isWeekly} formatValue={formatValue} />
      <PodiumColumn row={third} place={3} isWeekly={isWeekly} formatValue={formatValue} />
    </View>
  );
}

function PodiumColumn({
  row,
  place,
  isWeekly,
  formatValue,
}: {
  row: RankingRow;
  place: 1 | 2 | 3;
  isWeekly: boolean;
  formatValue: (v: number) => string;
}) {
  const isFirst = place === 1;
  const pedestalHeight = place === 1 ? 82 : place === 2 ? 56 : 46;
  return (
    <View style={styles.podiumCol}>
      <ExplorerAvatar
        rank={row.avatar}
        size={isFirst ? 68 : 54}
        ringColor={isFirst ? colors.brandAccent : place === 3 ? colors.feedbackXp : colors.borderStrong}
      />
      <Text style={styles.podiumName} numberOfLines={1}>
        {row.name}
      </Text>
      <Text
        style={[
          styles.podiumValue,
          isWeekly
            ? row.value > 0
              ? styles.valueGreen
              : row.value < 0
                ? styles.valueDanger
                : styles.valueMuted
            : styles.valuePrimary,
        ]}
      >
        {formatValue(row.value)}
      </Text>
      <View
        style={[
          styles.pedestal,
          { height: pedestalHeight },
          isFirst ? styles.pedestalFirst : styles.pedestalOther,
        ]}
      >
        <Text style={[styles.pedestalNum, isFirst && styles.pedestalNumFirst]}>{place}</Text>
      </View>
    </View>
  );
}

function RankingListRow({
  row,
  isWeekly,
  formatValue,
  isCurrentUser,
}: {
  row: RankingRow;
  isWeekly: boolean;
  formatValue: (v: number) => string;
  isCurrentUser: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowRank}>{row.rank}</Text>
      <ExplorerAvatar rank={row.avatar} size={40} ringColor={colors.storyTeal} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={type.titleCard} numberOfLines={1}>
          {isCurrentUser ? `${row.name} (you)` : row.name}
        </Text>
        <Text style={[type.labelDefault, { color: colors.textMuted }]}>
          Lv {row.level} · {formatNumber(row.elo)} Elo
        </Text>
      </View>
      <Text
        style={[
          styles.rowValue,
          isWeekly
            ? row.value > 0
              ? styles.valueGreen
              : row.value < 0
                ? styles.valueDanger
                : styles.valueMuted
            : styles.valuePrimary,
        ]}
      >
        {formatValue(row.value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  subtitle: {
    ...type.labelDefault,
    color: colors.textMuted,
  },

  segmentWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: colors.brandPrimarySoft,
    borderRadius: radii.pill,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.brandPrimary,
  },
  segmentLabel: {
    ...type.labelStrong,
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: '#FFFFFF',
  },

  categoryChipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  categoryChips: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  catChipSelected: {
    backgroundColor: colors.brandAccentSoft,
    borderColor: colors.brandPrimary,
  },
  catChipText: {
    ...type.labelStrong,
    color: colors.textMuted,
  },
  catChipTextSelected: {
    color: colors.brandPrimary,
  },

  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  leagueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brandAccentSoft,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  leagueBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.tile,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  podiumName: {
    ...type.labelStrong,
    fontSize: 13,
    marginTop: 2,
  },
  podiumValue: {
    ...type.labelStrong,
    fontSize: 13,
    marginBottom: 4,
  },
  pedestal: {
    width: '100%',
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalFirst: {
    backgroundColor: colors.brandPrimary,
  },
  pedestalOther: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  pedestalNum: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.textMuted,
  },
  pedestalNumFirst: {
    color: colors.brandAccent,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowRank: {
    ...type.labelStrong,
    width: 24,
    textAlign: 'center',
    color: colors.textMuted,
  },
  rowValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  valueGreen: {
    color: colors.feedbackSuccess,
  },
  valueDanger: {
    color: colors.feedbackDanger,
  },
  valueMuted: {
    color: colors.textMuted,
  },
  valuePrimary: {
    color: colors.textPrimary,
  },

  emptyCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },

  pinnedWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgCanvas,
  },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brandAccentSoft,
    borderRadius: radii.card + 2,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pinnedRank: {
    fontFamily: fonts.bold,
    fontSize: 14,
    width: 24,
    textAlign: 'center',
    color: colors.brandPrimary,
  },
  pinnedUnranked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandPrimarySoft,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
