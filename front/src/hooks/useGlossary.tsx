import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/user';
import type { GlossaryCategory } from '@/types/glossary';

type GlossaryValue = {
  categories: GlossaryCategory[];
  /** slug -> display name of every term (breadcrumbs and related links need names for slugs). */
  nameBySlug: Record<string, string>;
  loading: boolean;
  error?: Error;
  reload: () => void;
  /** Slugs of the terms the user saved. */
  favorites: ReadonlySet<string>;
  toggleFavorite: (slug: string) => void;
  /** Set when the last save/unsave failed (the star has been put back); cleared by the next toggle. */
  favoriteError?: string;
};

const GlossaryContext = createContext<GlossaryValue | undefined>(undefined);

/** Loads the term list and the user's favourites once for the whole Glossary tab. */
export function GlossaryProvider({ children }: { children: ReactNode }) {
  const { userId } = useCurrentUser();
  const userPath = `/api/users/${encodeURIComponent(userId)}/glossary`;
  const list = useApi<GlossaryCategory[]>('/api/glossary');
  const savedFavorites = useApi<string[]>(`${userPath}/favorites`);

  const [localFavorites, setLocalFavorites] = useState<Set<string>>();
  const [favoriteError, setFavoriteError] = useState<string>();

  // Failing to load favourites is not worth blocking the glossary: fall back to an empty list.
  const favorites = useMemo(
    () => localFavorites ?? new Set(savedFavorites.data ?? []),
    [localFavorites, savedFavorites.data],
  );

  const toggleFavorite = useCallback(
    (slug: string) => {
      const adding = !favorites.has(slug);
      setFavoriteError(undefined);
      // Optimistic: the star changes at once, and is put back only for this term if the request fails.
      setLocalFavorites((current) => {
        const next = new Set(current ?? favorites);
        if (adding) next.add(slug);
        else next.delete(slug);
        return next;
      });
      api(`${userPath}/favorites/${encodeURIComponent(slug)}`, { method: adding ? 'PUT' : 'DELETE' }).catch(() => {
        setLocalFavorites((current) => {
          const next = new Set(current);
          if (adding) next.delete(slug);
          else next.add(slug);
          return next;
        });
        setFavoriteError('Could not update your saved terms. Please try again.');
      });
    },
    [favorites, userPath],
  );

  const value = useMemo<GlossaryValue>(() => {
    const categories = list.data ?? [];
    const nameBySlug: Record<string, string> = {};
    for (const c of categories) for (const t of c.terms) nameBySlug[t.slug] = t.name;
    return {
      categories,
      nameBySlug,
      loading: list.loading,
      error: list.error,
      reload: list.reload,
      favorites,
      toggleFavorite,
      favoriteError,
    };
  }, [list.data, list.loading, list.error, list.reload, favorites, toggleFavorite, favoriteError]);

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

export function useGlossary(): GlossaryValue {
  const value = useContext(GlossaryContext);
  if (!value) throw new Error('useGlossary must be used inside <GlossaryProvider>');
  return value;
}
