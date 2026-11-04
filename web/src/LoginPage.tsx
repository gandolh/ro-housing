import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLogin, useSession, useWardSignIn } from '../vendor/ward/ward-auth-react.js';
import { appBase } from './base.ts';
import { Button } from './components/ui/Button.tsx';
import { Input } from './components/ui/Input.tsx';
import { Panel } from './components/ui/Panel.tsx';
import { loginMessage, sessionReasonMessage, wardSignInMessage } from './messages.ts';

/**
 * Username, password and Sign in, and "Sign in with Ward" under them when the
 * API has Ward. No sign-up: the owner's account comes from `npm run seed`, and
 * anyone else's through Ward once the owner grants them ro-housing there. A
 * Ward round trip that failed comes back as `?ward_error=`, which the hooks
 * turn into the message under the Ward button.
 */
export function LoginPage() {
  const session = useSession();
  const { login, pending, error } = useLogin();
  const ward = useWardSignIn();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [missing, setMissing] = useState<'username' | 'password' | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Sign in · ro-housing';
    return () => {
      document.title = 'ro-housing';
    };
  }, []);

  const signedOut = session.status === 'signed_out' ? session : null;
  const notice = sessionReasonMessage(signedOut?.reason);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const name = username.trim();
    const empty = name === '' ? 'username' : password === '' ? 'password' : null;
    setMissing(empty);
    if (empty !== null) {
      (empty === 'username' ? usernameRef : passwordRef).current?.focus();
      return;
    }
    void login(name, password).then((signedIn) => {
      if (signedIn) {
        ward.reset();
        return;
      }
      setPassword('');
      passwordRef.current?.focus();
    });
  };

  return (
    <main
      className="grid min-h-screen place-items-center px-4"
      aria-busy={pending || ward.pending || undefined}
    >
      <Panel className="w-full max-w-sm px-5 py-4">
        <h1 className="text-xl font-bold uppercase tracking-tight">ro-housing</h1>
        <p className="mt-1 text-sm text-ink-dim">Sign in to see the listings and your shortlist.</p>
        {notice !== null && (
          <p role="status" className="mt-3 border border-ink bg-panel-alt px-2 py-1.5 text-xs">
            {notice}
          </p>
        )}

        <form className="mt-4 flex flex-col gap-3" onSubmit={submit} noValidate aria-label="Sign in">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-ink-dim">Username</span>
            <Input
              ref={usernameRef}
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              value={username}
              aria-invalid={missing === 'username' || undefined}
              onChange={(event) => {
                setUsername(event.target.value);
                if (missing === 'username') setMissing(null);
              }}
            />
            {missing === 'username' && <span className="mt-1 block text-xs text-bad">Enter your username.</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-ink-dim">Password</span>
            <Input
              ref={passwordRef}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={missing === 'password' || undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                if (missing === 'password') setMissing(null);
              }}
            />
            {missing === 'password' && <span className="mt-1 block text-xs text-bad">Enter your password.</span>}
          </label>
          {error !== null && (
            <p role="alert" className="text-xs text-bad">
              {loginMessage(error)}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {signedOut?.ward.enabled && (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-center text-xs uppercase tracking-wide text-ink-faint" aria-hidden="true">
              or
            </p>
            <Button disabled={ward.pending} onClick={() => void ward.signIn({ returnTo: appBase() })}>
              {ward.pending ? 'Opening Ward…' : 'Sign in with Ward'}
            </Button>
          </div>
        )}
        {ward.error !== null && (
          <p role="alert" className="mt-3 text-xs text-bad">
            {wardSignInMessage(ward.error)}{' '}
            <button type="button" className="underline underline-offset-2" onClick={ward.reset}>
              Dismiss
            </button>
          </p>
        )}
      </Panel>
    </main>
  );
}
