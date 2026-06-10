'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Radio, Sun, Moon, X, Menu } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import Link from 'next/link';
import { getStoredUser } from '@/lib/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/contexts/ThemeContext';
import { useSearch } from '@/contexts/SearchContext';
import { MobileMenu } from '@/components/layout/MobileMenu';
import type { User } from '@/types';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showNewGuest?: boolean;
  showSearch?: boolean;
}

export function TopBar({ title, subtitle, showNewGuest, showSearch = true }: TopBarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { query, setQuery, clearQuery, hasQuery } = useSearch();

  useEffect(() => {
    setUser(getStoredUser<User>());
  }, []);

  const { canCreate } = usePermissions();
  const userInitials = user?.fullname?.[0] || 'U';
  const showAddGuest = showNewGuest && canCreate;

  const searchInput = showSearch ? (
    <div className="flex items-center gap-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-[10px] px-3 h-10 w-56 focus-within:border-cyan-400/40 transition-colors">
      <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
      <input
        placeholder="Rechercher..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-transparent text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-dimmed)] outline-none w-full"
      />
      {hasQuery && (
        <button
          type="button"
          onClick={clearQuery}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Effacer la recherche"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* ── MOBILE ── */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <header className="md:hidden sticky top-0 z-30 bg-[var(--bg-secondary)]/95 backdrop-blur-lg border-b border-[var(--border-subtle)] mb-4 shadow-sm">
        <div className="h-14 flex items-center justify-between px-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md">
              <Radio className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-violet-400 leading-none">El Maakoul</p>
              <h1 className="text-sm font-bold tracking-tight text-[var(--text-primary)] truncate">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showAddGuest && (
              <Link href="/guests/new">
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white shrink-0 shadow-sm active:scale-95 transition-transform"
                  aria-label="Nouvel invité"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </Link>
            )}
            <NotificationBell mobileSearchVisible={showSearch} />
            <button
              type="button"
              className="btn-ghost p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        {showSearch && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-xl px-3 h-11 w-full">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <input
                placeholder="Rechercher..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dimmed)] outline-none w-full"
              />
              {hasQuery && (
                <button type="button" onClick={clearQuery} aria-label="Effacer" className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── DESKTOP ── */}
      <header className="hidden md:flex h-16 sticky top-0 z-30 bg-[var(--bg-secondary)]/95 backdrop-blur-lg border-b border-[var(--border-subtle)] items-center justify-between px-8 mb-8 shadow-sm">
        <div>
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-cyan-400 mb-1 font-display">Podcast Studio</p>
          <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)] font-display">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {searchInput}
          {showAddGuest && (
            <Link href="/guests/new">
              <button className="btn-primary">+ Nouvel invité</button>
            </Link>
          )}
          <button className="btn-ghost relative" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <NotificationBell />
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-violet-400/30 to-pink-400/30 border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-bold text-cyan-300">
            {userInitials}
          </div>
        </div>
      </header>
    </>
  );
}
