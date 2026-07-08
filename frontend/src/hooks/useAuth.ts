import { useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { trySilentRefresh } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Runs once on app mount: silent refresh via the httpOnly cookie, then hydrate
 * the user from /auth/me. Sets `ready` so ProtectedRoute can decide.
 */
export function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setReady = useAuthStore((s) => s.setReady);

  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await trySilentRefresh();
      if (ok && active) {
        try {
          const user = await authService.me();
          if (active) setUser(user);
        } catch {
          /* token was set but /me failed — leave unauthenticated-ish */
        }
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [setReady, setUser]);
}
