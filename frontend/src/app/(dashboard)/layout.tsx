'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { getToken } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[240px] min-w-0">
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-20 md:pb-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  )
}
