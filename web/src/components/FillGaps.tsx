import { useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage, type ApartmentFields, type FillField, type FillJob } from '../api.ts';
import { Button } from './ui/Button.tsx';

interface Props {
  url: string;
  /** The draft's fields that are empty right now: the only ones asked for. */
  missing: FillField[];
  /** A bot-check page: there is no listing on it to read. */
  blocked: boolean;
  disabled?: boolean;
  /** Puts the model's values in the fields still empty; returns how many it filled. */
  onFilled: (values: Partial<ApartmentFields>) => number;
}

type Phase = { kind: 'idle' } | { kind: 'starting' } | { kind: 'waiting'; job: FillJob };

/** What the draft shows while the job is not finished. */
export function fillLine(job: FillJob): string {
  return job.status === 'running'
    ? 'Reading the page…'
    : `You're number ${job.ticket ?? '?'}, now serving ${job.nowServing ?? '?'}`;
}

/**
 * The draft's "Fill the gaps" button: one Wicket job that reads the page
 * Fetch details kept and fills only the fields still empty. While the job
 * waits it shows Wicket's ticket line and a Cancel; it polls until the job
 * ends (the server long-polls Wicket, so each poll waits up to 25 seconds).
 * Leaving the draft (Save, Discard, a new link) cancels a job still going.
 */
export function FillGaps({ url, missing, blocked, disabled, onFilled }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  // The running job; `stopped` once Cancel or unmount ends it here.
  const run = useRef<{ id: string; stopped: boolean } | null>(null);

  useEffect(
    () => () => {
      const current = run.current;
      if (current && !current.stopped) {
        current.stopped = true;
        void api.cancelFill(current.id).catch(() => {});
      }
    },
    [],
  );

  const finish = (job: FillJob) => {
    run.current = null;
    setPhase({ kind: 'idle' });
    if (job.status === 'done') {
      const filled = onFilled(job.values ?? {});
      setNotice(
        filled > 0
          ? {
              tone: 'ok',
              text: `Filled ${filled} ${filled === 1 ? 'field' : 'fields'} from AI${job.model ? ` (${job.model})` : ''}. Check them before saving.`,
            }
          : { tone: 'ok', text: 'The model found nothing more on the page.' },
      );
    } else if (job.status === 'failed') {
      setNotice({ tone: 'bad', text: `The model couldn't fill the gaps: ${job.error ?? 'no reason given'}` });
    } else {
      setNotice({ tone: 'bad', text: `Fill the gaps was cancelled: ${job.error ?? 'no reason given'}` });
    }
  };

  const start = async () => {
    setNotice(null);
    setPhase({ kind: 'starting' });
    let job: FillJob;
    try {
      job = await api.startFill(url, missing);
    } catch (err) {
      setPhase({ kind: 'idle' });
      setNotice({ tone: 'bad', text: apiErrorMessage(err) });
      return;
    }
    const mine = { id: job.id, stopped: false };
    run.current = mine;
    while (job.status === 'queued' || job.status === 'running') {
      setPhase({ kind: 'waiting', job });
      try {
        job = await api.pollFill(mine.id);
      } catch (err) {
        if (mine.stopped) return;
        run.current = null;
        setPhase({ kind: 'idle' });
        setNotice({ tone: 'bad', text: apiErrorMessage(err) });
        return;
      }
      if (mine.stopped) return;
    }
    finish(job);
  };

  const cancel = async () => {
    const current = run.current;
    if (!current) return;
    current.stopped = true;
    run.current = null;
    setPhase({ kind: 'idle' });
    setNotice({ tone: 'bad', text: 'Fill the gaps was cancelled here.' });
    await api.cancelFill(current.id).catch(() => {});
  };

  if (phase.kind === 'idle' && missing.length === 0 && !notice) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      {phase.kind === 'waiting' ? (
        <div className="flex items-center gap-2 text-xs" role="status">
          <span>{fillLine(phase.job)}</span>
          <Button variant="ghost" onClick={() => void cancel()}>
            Cancel
          </Button>
        </div>
      ) : (
        missing.length > 0 && (
          <Button
            variant="default"
            onClick={() => void start()}
            disabled={blocked || disabled || phase.kind === 'starting'}
            title={
              blocked
                ? 'A bot-check page has no listing on it to read.'
                : 'Ask a model to read the page for the empty fields. You check what it gives.'
            }
          >
            {phase.kind === 'starting' ? 'Asking…' : 'Fill the gaps'}
          </Button>
        )
      )}
      {notice && (
        <p role={notice.tone === 'bad' ? 'alert' : 'status'} className={notice.tone === 'bad' ? 'text-xs text-bad' : 'text-xs text-ok'}>
          {notice.text}
        </p>
      )}
    </div>
  );
}
