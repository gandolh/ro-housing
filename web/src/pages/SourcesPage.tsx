import { useEffect, useMemo, useState } from "react";
import { api, type Source } from "../api.ts";
import { ApiErrorNotice } from "../components/ApiErrorNotice.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Checkbox } from "../components/ui/Checkbox.tsx";
import { Input } from "../components/ui/Input.tsx";
import { Icon } from "../components/Icon.tsx";
import { LastRun } from "../components/RunStatus.tsx";
import { Island, IslandHead } from "../components/ui/Panel.tsx";

interface Draft {
  searchUrl: string;
  enabled: boolean;
}

function toDraft(s: Source): Draft {
  return { searchUrl: s.searchUrl ?? "", enabled: s.enabled };
}

function isDirty(server: Source, draft: Draft): boolean {
  return (server.searchUrl ?? "") !== draft.searchUrl || server.enabled !== draft.enabled;
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
  const [saveError, setSaveError] = useState<{ error: unknown } | null>(null);
  const [loadError, setLoadError] = useState<{ error: unknown } | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    const ss = await api.listSources();
    setSources(ss);
    setDrafts(Object.fromEntries(ss.map((s) => [s.id, toDraft(s)])));
  };

  // Like reload, but a row with unsaved edits keeps them. A failure shows in
  // place of the list, with Retry.
  const reloadKeepingEdits = async () => {
    const before = sources;
    setLoading(true);
    try {
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
      setLoadError(null);
    } catch (error) {
      setLoadError({ error });
    } finally {
      setLoading(false);
    }
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
    setSaveError(null);
    try {
      // Rows saved before a failure still count as edited here; saving them
      // again on Retry writes the same values.
      for (const id of dirtyIds) {
        const d = drafts[id];
        if (!d) continue;
        await api.updateSource(id, {
          searchUrl: d.searchUrl.trim() || null,
          enabled: d.enabled,
        });
      }
      await reload();
    } catch (error) {
      setSaveError({ error });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDrafts(Object.fromEntries(sources.map((s) => [s.id, toDraft(s)])));
    setSaveError(null);
  };

  const hasChanges = dirtyIds.length > 0;
  const failed = sources.filter((s) => s.enabled && s.lastRunOk === false).map((s) => s.displayName);
  const enabledCount = sources.filter((s) => drafts[s.id]?.enabled).length;

  return (
    <Island aria-label="Sources">
      <IslandHead className="max-[820px]:gap-2 max-[820px]:p-3">
        <Button
          variant="primary"
          disabled={!hasChanges || saving}
          onClick={() => void save()}
          className="max-[820px]:h-12 max-[820px]:w-20 max-[820px]:px-1"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="default"
          disabled={!hasChanges || saving}
          onClick={discard}
          className="max-[820px]:h-12 max-[820px]:w-20 max-[820px]:px-1"
        >
          Discard
        </Button>
        {hasChanges && <span className="text-xs font-bold text-warn">{dirtyIds.length} unsaved</span>}
        {failed.length > 0 && (
          <p className="m-0 inline-flex items-center gap-2 text-xs font-bold text-warn max-[820px]:order-last max-[820px]:basis-full">
            <Icon name="warn" />
            {failed.join(", ")} failed on its last run
          </p>
        )}
        {sources.length > 0 && (
          <span className="ml-auto whitespace-nowrap text-ink-dim max-[820px]:ml-auto max-[820px]:text-xs">
            {enabledCount} of {sources.length} enabled
          </span>
        )}
      </IslandHead>

      {saveError && (
        <div className="p-3">
          <ApiErrorNotice action="Not saved" error={saveError.error} onRetry={() => void save()} busy={saving} />
        </div>
      )}

      {loadError && (
        <div className="p-3">
          <ApiErrorNotice
            action="Couldn't load the sources"
            error={loadError.error}
            onRetry={() => void reloadKeepingEdits()}
            busy={loading}
          />
        </div>
      )}

      <ul className="m-0 list-none p-0">
        {sources.map((s) => {
          const draft = drafts[s.id];
          if (!draft) return null;
          const dirty = isDirty(s, draft);
          return (
            <li
              key={s.id}
              className="grid min-h-16 grid-cols-[20px_240px_minmax(0,1fr)_220px] items-center gap-x-4 border-b border-rule-soft px-4 py-3 last:border-b-0 max-[820px]:grid-cols-[48px_minmax(0,1fr)] max-[820px]:gap-x-0 max-[820px]:gap-y-1 max-[820px]:py-2.5 max-[820px]:pl-1 max-[820px]:pr-3"
            >
              <Checkbox
                id={`enabled-${s.id}`}
                aria-label={s.displayName}
                checked={draft.enabled}
                onCheckedChange={(checked) => setField(s.id, { enabled: Boolean(checked) })}
                className="size-5 max-[820px]:col-start-1 max-[820px]:row-span-2 max-[820px]:self-start max-[820px]:justify-self-center max-[820px]:mt-1.5"
              />
              <div className="flex min-w-0 flex-col max-[820px]:col-start-2 max-[820px]:row-start-1">
                <label htmlFor={`enabled-${s.id}`} className="cursor-pointer break-words font-medium">
                  {s.displayName}
                </label>
                <span className="break-words text-xs text-ink-dim max-[820px]:hidden">{s.id}</span>
              </div>
              <Input
                aria-label={`Search URL for ${s.displayName}`}
                placeholder="Paste search URL from this site…"
                value={draft.searchUrl}
                onChange={(e) => setField(s.id, { searchUrl: e.target.value })}
                className="max-[820px]:col-start-2 max-[820px]:row-start-2 max-[820px]:h-12"
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 max-[820px]:col-start-2 max-[820px]:row-start-3">
                <LastRun source={s} />
                {dirty && <span className="whitespace-nowrap text-xs font-bold text-accent">modified</span>}
                <span
                  className="ml-auto hidden whitespace-nowrap text-xs text-ink-dim max-[820px]:inline"
                  aria-hidden="true"
                >
                  {s.id}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Island>
  );
}
