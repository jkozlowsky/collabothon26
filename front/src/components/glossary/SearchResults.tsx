import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CategoryPill } from '@/components/glossary/CategoryPill';
import { categoryStyle } from '@/constants/glossary';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { splitMatch } from '@/lib/glossarySearch';
import type { GlossaryCategory, Mention, SearchResponse, TermHit } from '@/types/glossary';

type Props = {
  /** What the user typed (trimmed). */
  query: string;
  data?: SearchResponse;
  /** The query `data` answers; highlights use it, because `query` can already be ahead. */
  resultQuery: string;
  loading: boolean;
  error?: Error;
  onRetry: () => void;
  categories: GlossaryCategory[];
  onOpenTerm: (slug: string) => void;
  onBrowseCategory: (slug: string) => void;
};

/** Search results, "No results" with "Did you mean", and terms whose definition mentions the text. */
export function SearchResults({
  query,
  data,
  resultQuery,
  loading,
  error,
  onRetry,
  categories,
  onOpenTerm,
  onBrowseCategory,
}: Props) {
  if (error) {
    return (
      <View style={styles.block} testID="search-error">
        <Text style={type.titleSection}>Search is not available right now</Text>
        <Button label="Try again" onPress={onRetry} variant="secondary" />
      </View>
    );
  }
  if (!data) {
    return loading ? <ActivityIndicator color={colors.brandPrimary} testID="search-loading" /> : null;
  }

  const noMatch = data.terms.length === 0;
  return (
    <View style={styles.results} testID="search-results">
      {noMatch ? (
        <View style={styles.empty} testID="search-empty">
          <View style={styles.emptyIcon}>
            <Feather name="search" size={24} color={colors.textPrimary} />
          </View>
          <Text style={type.titleCard}>No terms match your search</Text>
          <Text style={styles.emptyText}>Check the spelling or try a related word. You can also browse by category.</Text>
        </View>
      ) : (
        <Text style={styles.count} accessibilityLiveRegion="polite">
          {data.terms.length} {data.terms.length === 1 ? 'term matches' : 'terms match'} “{resultQuery}”
        </Text>
      )}

      {noMatch && data.suggestions.length > 0 && (
        <Section title="Did you mean">
          {data.suggestions.map((hit) => (
            <ResultCard key={hit.slug} hit={hit} query="" onPress={() => onOpenTerm(hit.slug)} />
          ))}
        </Section>
      )}

      {!noMatch && data.terms.map((hit) => <ResultCard key={hit.slug} hit={hit} query={resultQuery} onPress={() => onOpenTerm(hit.slug)} />)}

      {data.mentions.length > 0 && (
        <Section title="Mentioned in other definitions" count={data.mentions.length}>
          <View style={styles.card}>
            {data.mentions.map((mention, i) => (
              <MentionRow key={mention.slug} mention={mention} first={i === 0} onPress={() => onOpenTerm(mention.slug)} />
            ))}
          </View>
        </Section>
      )}

      {noMatch && (
        <Section title="Browse by category">
          <View style={styles.chips}>
            {categories.map((c) => (
              <Pressable
                key={c.slug}
                testID={`browse-${c.slug}`}
                accessibilityRole="button"
                onPress={() => onBrowseCategory(c.slug)}
                style={styles.chip}
              >
                <Feather name={categoryStyle(c.slug).icon} size={16} color={colors.textPrimary} />
                <Text style={type.labelStrong}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </Section>
      )}
      {/* `query` is only used when the field text and the shown results are out of step. */}
      {loading && query !== resultQuery && <ActivityIndicator color={colors.brandPrimary} testID="search-loading" />}
    </View>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={type.titleSection} accessibilityRole="header">
          {title}
        </Text>
        {count !== undefined && <Text style={styles.count}>{count}</Text>}
      </View>
      {children}
    </View>
  );
}

function ResultCard({ hit, query, onPress }: { hit: TermHit; query: string; onPress: () => void }) {
  const { before, match, after } = splitMatch(hit.name, query);
  return (
    <Pressable
      testID={`result-${hit.slug}`}
      accessibilityRole="button"
      accessibilityLabel={`${hit.name}, ${hit.category.name}. ${hit.shortDescription}`}
      onPress={onPress}
      style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}
    >
      <View style={styles.resultTop}>
        <CategoryPill slug={hit.category.slug} name={hit.category.name} />
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </View>
      <Text style={type.titleCard}>
        {before}
        {match !== '' && <Text style={styles.match}>{match}</Text>}
        {after}
      </Text>
      <Text style={styles.description}>{hit.shortDescription}</Text>
    </Pressable>
  );
}

function MentionRow({ mention, first, onPress }: { mention: Mention; first: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={`mention-${mention.slug}`}
      accessibilityRole="button"
      accessibilityLabel={`${mention.name}. ${mention.snippet}`}
      onPress={onPress}
      style={({ pressed }) => [styles.mention, !first && styles.mentionDivider, pressed && styles.pressed]}
    >
      <View style={styles.mentionText}>
        <Text style={type.titleCard}>{mention.name}</Text>
        <Text style={styles.snippet} numberOfLines={2}>
          {mention.snippet}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  results: { gap: spacing.md },
  block: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  count: { ...type.labelDefault, color: colors.textMuted },
  section: { gap: 10, marginTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  emptyIcon: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...type.bodyDefault, color: colors.textMuted, textAlign: 'center' },
  resultCard: {
    gap: 6,
    padding: 14,
    paddingLeft: 16,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...elevation.low,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  resultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  match: { backgroundColor: colors.brandAccentSoft },
  description: { ...type.bodyDefault, color: colors.textMuted },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    ...elevation.low,
  },
  mention: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: 14, minHeight: 64 },
  mentionDivider: { borderTopWidth: 1, borderTopColor: colors.borderDefault },
  mentionText: { flex: 1 },
  snippet: { ...type.labelDefault, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
});
