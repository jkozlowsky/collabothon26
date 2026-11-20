import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { Button } from '@/components/Button';
import { Breadcrumb, type Crumb } from '@/components/glossary/Breadcrumb';
import { CategoryPill } from '@/components/glossary/CategoryPill';
import { DefinitionText } from '@/components/glossary/DefinitionText';
import { FavoriteButton } from '@/components/glossary/FavoriteButton';
import { TermGraphic } from '@/components/glossary/graphics';
import { LevelToggle } from '@/components/glossary/LevelToggle';
import { RelatedTerms } from '@/components/glossary/RelatedTerms';
import { colors, elevation, nav, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { useGlossary } from '@/hooks/useGlossary';
import type { LanguageLevel, TermDetail } from '@/types/glossary';

/** `trail` is the comma-separated slugs of the terms visited before this one (Expo Router has no history API). */
export default function DefinitionScreen() {
  const { slug, trail } = useLocalSearchParams<{ slug: string; trail?: string }>();
  const { nameBySlug, favorites, toggleFavorite, favoriteError, languageLevel, setLanguageLevel } = useGlossary();
  const { data, loading, error, reload } = useApi<TermDetail>(`/api/glossary/terms/${encodeURIComponent(slug)}`);

  const previous = trail ? trail.split(',').filter(Boolean) : [];

  // Every link pushes a new screen, so the system back button returns to the term you came from.
  const openTerm = (next: string) =>
    router.push({ pathname: '/glossary/[slug]', params: { slug: next, trail: [...previous, slug].join(',') } });

  const crumbs: Crumb[] = [
    { label: 'Glossary', onPress: () => router.dismissAll() },
    // Tapping step i goes back (previous.length - i) screens.
    ...previous.map((s, i) => ({ label: nameBySlug[s] ?? s, onPress: () => router.dismiss(previous.length - i) })),
    { label: data?.name ?? nameBySlug[slug] ?? slug },
  ];

  const notFound = error?.message.includes('404');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']} testID="screen-definition">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable
            testID="definition-back"
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/glossary'))}
            style={styles.back}
          >
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </Pressable>
          {data && (
            <View style={styles.topRight}>
              <CategoryPill slug={data.category.slug} name={data.category.name} />
              <FavoriteButton saved={favorites.has(data.slug)} onPress={() => toggleFavorite(data.slug)} />
            </View>
          )}
        </View>
        {favoriteError && (
          <Text style={styles.error} accessibilityRole="alert">
            {favoriteError}
          </Text>
        )}
        <Breadcrumb crumbs={crumbs} />

        {notFound ? (
          <View style={styles.center}>
            <Text style={type.titleSection}>This term does not exist</Text>
            <Button label="Back to the glossary" onPress={() => router.dismissAll()} variant="secondary" />
          </View>
        ) : (
          <AsyncContent loading={loading} error={error} onRetry={reload}>
            {() => data && <Definition term={data} level={languageLevel} onLevelChange={setLanguageLevel} onOpenTerm={openTerm} />}
          </AsyncContent>
        )}
        <Text style={styles.disclaimer}>Educational content, not investment advice.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type DefinitionProps = {
  term: TermDetail;
  level: LanguageLevel;
  onLevelChange: (level: LanguageLevel) => void;
  onOpenTerm: (slug: string) => void;
};

function Definition({ term, level, onLevelChange, onOpenTerm }: DefinitionProps) {
  // Not every term has a plain version yet; then the standard text is shown and we say so.
  const plainMissing = level === 'plain' && !term.definitionPlain;
  const text = level === 'plain' && term.definitionPlain ? term.definitionPlain : term.definitionStandard;
  return (
    <>
      <View style={styles.title}>
        <Text style={type.displayLarge} accessibilityRole="header" testID="definition-title">
          {term.name}
        </Text>
        {term.fullName && <Text style={styles.fullName}>{term.fullName}</Text>}
      </View>

      <LevelToggle value={level} onChange={onLevelChange} />

      <View style={styles.card}>
        <Text style={type.overline}>Definition</Text>
        <DefinitionText text={text} onOpenTerm={onOpenTerm} />
        {plainMissing && (
          <Text style={styles.hintText} testID="plain-missing">
            No plain-words version yet, showing the standard definition.
          </Text>
        )}
        <View style={styles.hint}>
          <Feather name="info" size={14} color={colors.globeOceanLight} />
          <Text style={styles.hintText}>Tap an underlined word to open its definition</Text>
        </View>
      </View>

      <TermGraphic graphicKey={term.graphicKey} />

      {term.example && (
        <View style={styles.example} testID="definition-example">
          <Text style={[type.overline, { color: colors.textOnAccent }]}>Example</Text>
          <Text style={styles.exampleText}>{term.example}</Text>
        </View>
      )}

      <RelatedTerms terms={term.related} onOpenTerm={onOpenTerm} />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgCanvas },
  // Bottom padding clears the floating nav, like Screen.
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: nav.clearance + spacing.lg, gap: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.low,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  error: { ...type.labelDefault, color: colors.feedbackDanger },
  title: { gap: 2 },
  fullName: { ...type.bodyDefault, color: colors.textMuted },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 18,
    gap: spacing.md,
    ...elevation.low,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintText: { ...type.labelDefault, color: colors.textMuted },
  example: {
    backgroundColor: colors.brandAccentSoft,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.brandAccent,
    padding: 18,
    gap: spacing.sm,
  },
  exampleText: { ...type.bodyDefault, fontSize: 14, lineHeight: 22 },
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  disclaimer: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center' },
});
