'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Bell, Radio, LogOut, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { GlowButton } from '@/components/ui/GlowButton';
import { getStoredUser, clearAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import type { User } from '@/types';

interface TopBarProps {
  title: string;
  subtitle?: string;
  showNewGuest?: boolean;
}

export function TopBar({ title, subtitle, showNewGuest }: TopBarProps) {
  const [user, setUser] = useState<User | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setUser(getStoredUser<User>());
  }, []);

  const userInitials = user?.fullname?.[0] || 'U';
  const hasNotifications = false;

  return (
    <>
      {/* ── MOBILE ── */}
      <header className="md:hidden h-14 sticky top-0 z-30 bg-[var(--bg-secondary)] backdrop-blur-lg border-b border-[var(--border-subtle)] flex items-center justify-between px-4 mb-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[8px] bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shrink-0">
            <Radio className="w-3 h-3 text-black" strokeWidth={3} />
          </div>
          <span className="text-[12px] font-bold tracking-tight text-[var(--text-primary)] uppercase font-display">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {showNewGuest && (
            <Link href="/guests/new">
              <button className="btn-primary h-8 px-3 text-[10px]">+ Invité</button>
            </Link>
          )}
          <button className="btn-ghost relative p-2" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button className="btn-ghost relative p-2">
            <Bell className="w-4 h-4" />
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-glow" />
            )}
          </button>
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-violet-400/30 to-pink-400/30 border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-bold text-cyan-300">
            {userInitials}
          </div>
        </div>
      </header>

      {/* ── DESKTOP ── */}
      <header className="hidden md:flex h-16 sticky top-0 z-30 bg-[var(--bg-secondary)] backdrop-blur-lg border-b border-[var(--border-subtle)] items-center justify-between px-8 mb-8 shadow-sm">
        <div>
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-cyan-400 mb-1 font-display">Podcast Studio</p>
          <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)] font-display">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-[10px] px-3 h-10 w-56">
            <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input placeholder="Rechercher..." className="bg-transparent text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-dimmed)] outline-none w-full" />
          </div>
          {showNewGuest && (
            <Link href="/guests/new">
              <button className="btn-primary">+ Nouvel invité</button>
            </Link>
          )}
          <button className="btn-ghost relative" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button className="btn-ghost relative">
            <Bell className="w-4 h-4" />
            {hasNotifications && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-glow" />
            )}
          </button>
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-violet-400/30 to-pink-400/30 border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-bold text-cyan-300">
            {userInitials}
          </div>
        </div>
      </header>
    </>
  )
}
