'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { SearchProvider } from '@/contexts/SearchContext';
import { initAuth } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (isAuthenticated()) {
        setReady(true);
        return;
      }
      const ok = await initAuth();
      if (!ok) {
        router.replace('/login');
        return;
      }
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-pulse text-white/40 text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <SearchProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-[240px] min-w-0">
          <main className="flex-1 px-4 py-4 md:px-8 md:py-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8 min-w-0 overflow-x-hidden max-w-full">
            {children}
          </main>
        </div>
        <BottomTabBar />
      </div>
    </SearchProvider>
  );
}
