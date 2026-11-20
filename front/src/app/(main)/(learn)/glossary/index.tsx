import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Screen } from '@/components/Screen';
import { CategorySection } from '@/components/glossary/CategorySection';
import { SavedToggle } from '@/components/glossary/SavedToggle';
import { SearchField } from '@/components/glossary/SearchField';
import { SearchResults } from '@/components/glossary/SearchResults';
import { colors, spacing, type } from '@/constants/theme';
import { useGlossary } from '@/hooks/useGlossary';
import { useGlossarySearch } from '@/hooks/useGlossarySearch';

export default function GlossaryScreen() {
  const { categories, loading, error, reload, favorites, toggleFavorite, favoriteError } = useGlossary();
  const [query, setQuery] = useState('');
  const search = useGlossarySearch(query);
  const [showingSaved, setShowingSaved] = useState(false);
  // What the user opened or closed, kept separately for "All" and "Saved" so one view never changes the other.
  // Only touched categories are stored; untouched ones use the default (see isOpen).
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [toggledSaved, setToggledSaved] = useState<Record<string, boolean>>({});

  const visible = showingSaved
    ? categories.map((c) => ({ ...c, terms: c.terms.filter((t) => favorites.has(t.slug)) })).filter((c) => c.terms.length > 0)
    : categories;
  // All: the first category starts open. Saved: everything starts open (it is a short list).
  const isOpen = (slug: string) =>
    showingSaved ? (toggledSaved[slug] ?? true) : (toggled[slug] ?? slug === categories[0]?.slug);
  const toggle = (slug: string) => {
    const set = showingSaved ? setToggledSaved : setToggled;
    set((t) => ({ ...t, [slug]: !isOpen(slug) }));
  };
  // From "No results": leave search and open the chosen category in the full list.
  const browseCategory = (slug: string) => {
    setQuery('');
    setShowingSaved(false);
    setToggled((t) => ({ ...t, [slug]: true }));
  };
  const openTerm = (slug: string) => router.push({ pathname: '/glossary/[slug]', params: { slug, trail: '' } });

  return (
    <Screen
      title={showingSaved ? 'Saved terms' : 'Glossary'}
      testID="screen-glossary"
      scroll
      headerRight={<SavedToggle count={favorites.size} active={showingSaved} onPress={() => setShowingSaved((s) => !s)} />}
    >
      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => (
          <View style={styles.body}>
            <SearchField value={query} onChangeText={setQuery} />
            {favoriteError && (
              <Text style={styles.error} accessibilityRole="alert">
                {favoriteError}
              </Text>
            )}
            {search.active ? (
              <SearchResults
                query={query.trim()}
                data={search.data}
                resultQuery={search.resultQuery}
                loading={search.loading}
                error={search.error}
                onRetry={search.retry}
                categories={categories}
                onOpenTerm={openTerm}
                onBrowseCategory={browseCategory}
              />
            ) : (
              <>
                {showingSaved && visible.length === 0 && (
                  <Text style={styles.empty} testID="saved-empty">
                    No saved terms yet. Tap the star on any definition.
                  </Text>
                )}
                {visible.map((category) => (
                  <CategorySection
                    key={category.slug}
                    category={category}
                    expanded={isOpen(category.slug)}
                    favorites={favorites}
                    onToggleSaved={toggleFavorite}
                    onToggle={() => toggle(category.slug)}
                    onOpenTerm={(term) => openTerm(term.slug)}
                  />
                ))}
              </>
            )}
            <Text style={styles.disclaimer}>Educational content, not investment advice.</Text>
          </View>
        )}
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  empty: { ...type.bodyDefault, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
  error: { ...type.labelDefault, color: colors.feedbackDanger },
  disclaimer: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
