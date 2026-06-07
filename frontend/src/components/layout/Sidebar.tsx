'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Kanban, Mic2, LogOut, Radio, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/episodes', label: 'Épisodes', icon: Mic2 },
  { href: '/integrations', label: 'Intégrations', icon: Link2 },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex-col hidden md:flex z-40">
      {/* Logo - Premium */}
      <div className="px-6 py-6 border-b border-[var(--border-subtle)]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-glow transition-all">
            <Radio className="w-4 h-4 text-black" strokeWidth={3} />
          </div>
          <div>
            <p className="text-[12px] font-black tracking-tight text-[var(--text-primary)] leading-none font-display">EL MAAKOUL</p>
            <p className="text-[9px] font-600 tracking-[0.12em] uppercase text-cyan-400 mt-1">Studio CRM</p>
          </div>
        </Link>
      </div>

      {/* Nav - Modern */}
      <nav className="flex-1 py-6 overflow-y-auto px-4">
        <p className="px-3 pb-3 text-[9px] font-bold tracking-[0.12em] uppercase text-[var(--text-muted)]">
          Navigation
        </p>
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                'flex items-center gap-3 mx-2 px-3 py-3 rounded-[10px] text-[12px] font-600 transition-all duration-200 mb-1',
                active
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 text-cyan-300 border-l-2 border-cyan-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              )}>
                <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout - Premium */}
      <button
        onClick={handleLogout}
        className="mx-4 mb-6 px-3 py-3 flex items-center gap-3 text-[11px] text-[var(--text-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 rounded-[10px] transition-all w-[calc(100%-2rem)]"
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </button>
    </aside>
  )
}
