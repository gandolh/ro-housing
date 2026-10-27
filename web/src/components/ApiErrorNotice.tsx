import { apiErrorMessage } from '../api.ts';
import { Button } from './ui/Button.tsx';

interface Props {
  /** What the failed call threw. */
  error: unknown;
  /** Runs the call again. */
  onRetry: () => void;
  /** True while the retry runs. */
  busy?: boolean;
  /** What failed, put before the reason: "Couldn't load the listings". */
  action?: string;
}

/** Shown in place of a page's list, or under a form, when a call to the API
 *  fails: says why ("Can't reach the API: is it running?") and offers Retry. */
export function ApiErrorNotice({ error, onRetry, busy = false, action }: Props) {
  const reason = apiErrorMessage(error);
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border border-bad bg-bad-soft px-3 py-2 text-xs text-bad"
    >
      <span className="flex-1">{action ? `${action}. ${reason}` : reason}</span>
      <Button variant="default" onClick={onRetry} disabled={busy}>
        {busy ? 'Retrying…' : 'Retry'}
      </Button>
    </div>
  );
}
