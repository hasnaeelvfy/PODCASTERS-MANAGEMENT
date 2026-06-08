'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initAuth } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      if (isAuthenticated()) {
        router.replace('/dashboard');
        return;
      }
      const ok = await initAuth();
      router.replace(ok ? '/dashboard' : '/login');
    })();
  }, [router]);
  return null;
}
