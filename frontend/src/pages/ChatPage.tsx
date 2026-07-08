import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

// Placeholder — the chat UI lands in Phase 6.2.
export function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clear();
      window.location.assign('/login');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <h1 className="font-semibold">Financial Data Chat</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user?.displayName ?? user?.email}</span>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center text-muted-foreground">
        Chat UI arrives in Phase 6.2.
      </main>
    </div>
  );
}
