import { useEffect, useMemo, useState } from 'react';
import { api, type Source } from '../api.ts';
import { cn } from '../lib/cn.ts';
import { Button } from '../components/ui/Button.tsx';
import { Checkbox } from '../components/ui/Checkbox.tsx';
import { Input } from '../components/ui/Input.tsx';
import { StatusDot } from '../components/ui/StatusDot.tsx';

interface Draft {
  searchUrl: string;
  enabled: boolean;
}

function fmtWhen(ts: number | null): string {
  if (ts === null) return 'never';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function toDraft(s: Source): Draft {
  return { searchUrl: s.searchUrl ?? '', enabled: s.enabled };
}

function isDirty(server: Source, draft: Draft): boolean {
  return (
    (server.searchUrl ?? '') !== draft.searchUrl ||
    server.enabled !== draft.enabled
  );
}

interface Props {
  /** Whether the Sources tab is the open one. The page stays mounted behind
   *  the tabs, so it re-reads the last runs each time it opens. */
  active?: boolean;
}

export function SourcesPage({ active = true }: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const ss = await api.listSources();
    setSources(ss);
    setDrafts(Object.fromEntries(ss.map((s) => [s.id, toDraft(s)])));
  };

  // Like reload, but a row with unsaved edits keeps them.
  const reloadKeepingEdits = async () => {
    const before = sources;
    const ss = await api.listSources();
    setSources(ss);
    setDrafts((prev) =>
      Object.fromEntries(
        ss.map((s) => {
          const draft = prev[s.id];
          const old = before.find((o) => o.id === s.id);
          return [s.id, draft && old && isDirty(old, draft) ? draft : toDraft(s)];
        }),
      ),
    );
  };

  useEffect(() => {
    if (active) void reloadKeepingEdits();
  }, [active]);

  const dirtyIds = useMemo(
    () =>
      sources
        .filter((s) => {
          const d = drafts[s.id];
          return d !== undefined && isDirty(s, d);
        })
        .map((s) => s.id),
    [sources, drafts],
  );

  const setField = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, ...patch } };
    });
  };

  const save = async () => {
    if (dirtyIds.length === 0) return;
    setSaving(true);
    try {
      for (const id of dirtyIds) {
        const d = drafts[id];
        if (!d) continue;
        await api.updateSource(id, {
          searchUrl: d.searchUrl.trim() || null,
          enabled: d.enabled,
        });
      }
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDrafts(Object.fromEntries(sources.map((s) => [s.id, toDraft(s)])));
  };

  const hasChanges = dirtyIds.length > 0;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="primary"
          disabled={!hasChanges || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          variant="default"
          disabled={!hasChanges || saving}
          onClick={discard}
        >
          Discard
        </Button>
        {hasChanges && (
          <span className="text-xs uppercase tracking-wide text-warn">
            {dirtyIds.length} unsaved
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {sources.map((s) => {
          const draft = drafts[s.id];
          if (!draft) return null;
          const dirty = isDirty(s, draft);
          const dot =
            s.lastRunOk === null ? 'unknown' : s.lastRunOk ? 'ok' : 'bad';
          return (
            <div
              key={s.id}
              className={cn(
                'grid grid-cols-[auto_1fr_auto] items-center gap-4 border bg-panel px-3 py-2',
                dirty ? 'border-accent' : 'border-ink',
              )}
            >
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={draft.enabled}
                  onCheckedChange={(checked) =>
                    setField(s.id, { enabled: Boolean(checked) })
                  }
                />
                <span className="text-sm">{s.displayName}</span>
              </label>
              <div>
                <Input
                  placeholder="Paste search URL from this site…"
                  value={draft.searchUrl}
                  onChange={(e) =>
                    setField(s.id, { searchUrl: e.target.value })
                  }
                />
                <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-dim">
                  <StatusDot status={dot} />
                  <span>last run: {fmtWhen(s.lastRunAt)}</span>
                  {s.lastRunOk === false && (
                    <span className="text-bad">— failed</span>
                  )}
                  {dirty && (
                    <span className="ml-2 text-accent">▸ modified</span>
                  )}
                </div>
              </div>
              <div className="text-xs uppercase tracking-wide text-ink-faint">
                {s.id}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
