import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser<User>());
  }, []);

  return { user };
}
