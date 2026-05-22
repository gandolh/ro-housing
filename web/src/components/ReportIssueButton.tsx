import { useEffect, useState } from 'react';
import { ApiError, api } from '../api.ts';
import { Button } from './ui/Button.tsx';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './ui/Dialog.tsx';
import { Textarea } from './ui/Textarea.tsx';

export function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ count: number; max: number } | null>(
    null,
  );
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const loadStatus = async () => {
    try {
      setStatus(await api.getIssuesStatus());
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleOpenChange = async (next: boolean) => {
    if (next) {
      setError(null);
      setJustSent(false);
      setBody('');
      await loadStatus();
    }
    setOpen(next);
  };

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError('Please write something first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.submitIssue(trimmed);
      setStatus({ count: result.count, max: result.max });
      setJustSent(true);
      setBody('');
      setTimeout(() => {
        setOpen(false);
        setJustSent(false);
      }, 1200);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        if (e.status === 409) void loadStatus();
      } else {
        setError('Network error. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const atCap = status !== null && status.count >= status.max;
  const counter =
    status === null ? '—/—' : `${status.count}/${status.max}`;
  const label = atCap ? `Report (${counter} — full)` : `Report (${counter})`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={(props) => (
          <Button {...props} variant="default" className="h-7 px-3 text-sm">
            {label}
          </Button>
        )}
      />
      <DialogContent>
        <div className="flex items-baseline justify-between">
          <DialogTitle>Report an issue</DialogTitle>
          {status && (
            <span className="text-xs text-ink-dim">{counter} pending</span>
          )}
        </div>
        <DialogDescription>
          Bugs, friction, ideas. Claude reads these, acts on them, and deletes
          the file when done.
        </DialogDescription>

        <Textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={submitting || justSent}
          placeholder="What's wrong, or what would be better?"
          rows={6}
          maxLength={5000}
          className="mt-3"
        />

        {error && (
          <div className="mt-3 border border-bad bg-bad-soft px-2 py-1.5 text-xs text-bad">
            {error}
          </div>
        )}
        {justSent && (
          <div className="mt-3 border border-ok bg-ok-soft px-2 py-1.5 text-xs text-ok">
            Saved. Thanks.
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <DialogClose
            render={(props) => (
              <Button
                {...props}
                variant="default"
                disabled={submitting}
              >
                Cancel
              </Button>
            )}
          />
          <Button
            variant="primary"
            onClick={submit}
            disabled={submitting || justSent || atCap}
          >
            {submitting ? 'Sending…' : 'Submit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
