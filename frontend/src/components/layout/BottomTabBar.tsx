'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Kanban, Mic2, DollarSign, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/episodes', label: 'Épisodes', icon: Mic2 },
  { href: '/sponsors', label: 'Sponsors', icon: DollarSign },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] grid grid-cols-5 pb-safe md:hidden"
      aria-label="Navigation principale"
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} aria-label={tab.label} title={tab.label}>
            <div
              className={cn(
                'flex items-center justify-center h-11 min-h-[44px] transition-all relative',
                active ? 'text-violet-400' : 'text-[var(--text-muted)] active:scale-95',
              )}
            >
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
              )}
              <Icon className="w-[20px] h-[20px]" strokeWidth={active ? 2.5 : 2} />
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
