import { useEffect, useState } from 'react';
import { authStorage, type StoredUser } from '@/lib/auth-storage';

export function useCurrentUser(): StoredUser | null {
  const [user, setUser] = useState<StoredUser | null>(() => authStorage.getUser());

  useEffect(() => {
    const handler = () => setUser(authStorage.getUser());
    window.addEventListener('career_ai:auth-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('career_ai:auth-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return user;
}
