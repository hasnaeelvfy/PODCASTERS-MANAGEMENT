'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  clearQuery: () => void;
  hasQuery: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState('');

  const setQuery = useCallback((q: string) => setQueryState(q), []);
  const clearQuery = useCallback(() => setQueryState(''), []);

  return (
    <SearchContext.Provider
      value={{ query: query.trim(), setQuery, clearQuery, hasQuery: query.trim().length > 0 }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}

/** Match a guest/episode against a search query (case-insensitive). */
export function matchesSearch(
  query: string,
  fields: (string | null | undefined)[],
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => f && f.toLowerCase().includes(q));
}
