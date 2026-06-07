'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Kanban, Mic2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/episodes', label: 'Épisodes', icon: Mic2 },
  { href: '/integrations', label: 'Intégrations', icon: Link2 },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] backdrop-blur-xl border-t border-[var(--border-subtle)] grid grid-cols-4 pb-safe md:hidden shadow-2xl"
      style={{ height: '56px' }}
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href}>
            <div className={cn(
              'flex flex-col items-center justify-center h-full gap-1 relative transition-all duration-200',
              active ? 'text-cyan-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-gradient-to-r from-cyan-400 to-cyan-300 rounded-full" />
              )}
              <Icon className="w-4 h-4" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[8px] font-bold tracking-[0.08em] uppercase">{tab.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  )
}
