import { useEffect, type ReactNode } from 'react';
import { useSession } from '../vendor/ward/ward-auth-react.js';
import { Button } from './components/ui/Button.tsx';
import { Panel } from './components/ui/Panel.tsx';
import { LoginPage } from './LoginPage.tsx';
import { navigate, usePage } from './route.ts';

/**
 * The session gate around the app, on the vendored hooks (`useSession`: one
 * shared state, asked of `GET /ro-housing-api/auth/session`):
 *
 * - loading: a quiet "Loading…";
 * - signed out: the address becomes `/ro-housing/login` and the login page
 *   shows, with the reason when a session just ended;
 * - signed in: the app. On `/login` (just signed in, or a bookmark) it goes on
 *   to the app;
 * - the question failing (the API is down): a line saying so, and Try again.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  switch (session.status) {
    case 'loading':
      return (
        <main className="grid min-h-screen place-items-center" aria-busy="true">
          <p className="text-sm text-ink-dim">Loading…</p>
        </main>
      );
    case 'error':
      return (
        <main className="grid min-h-screen place-items-center px-4">
          <Panel className="w-full max-w-sm px-5 py-4">
            <h1 className="text-xl font-bold uppercase tracking-tight">ro-housing</h1>
            <p role="alert" className="mt-3 text-sm text-bad">
              ro-housing can&apos;t be reached. Check your connection and try again.
            </p>
            <Button className="mt-3" onClick={() => void session.refresh()}>
              Try again
            </Button>
          </Panel>
        </main>
      );
    case 'signed_out':
      return <SignedOut />;
    case 'signed_in':
      return <SignedIn>{children}</SignedIn>;
  }
}

function SignedOut() {
  const atLogin = usePage() === 'login';
  useEffect(() => {
    if (!atLogin) navigate('login', { replace: true });
  }, [atLogin]);
  return <LoginPage />;
}

function SignedIn({ children }: { children: ReactNode }) {
  const atLogin = usePage() === 'login';
  useEffect(() => {
    if (atLogin) navigate('app', { replace: true });
  }, [atLogin]);
  // Nothing for the instant `/login` is replaced, so the app never mounts on it.
  return atLogin ? null : children;
}
