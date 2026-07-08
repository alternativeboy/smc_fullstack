import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const ready = useAuthStore((s) => s.ready);
  const token = useAuthStore((s) => s.accessToken);

  if (!ready) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
