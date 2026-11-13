import { useEffect, useMemo, useState } from "react";
import { ApiErrorNotice } from "../components/ApiErrorNotice.tsx";
import { ListingsTable } from "../components/ListingsTable.tsx";
import { Icon } from "../components/Icon.tsx";
import { LastRun } from "../components/RunStatus.tsx";
import { Island, IslandHead } from "../components/ui/Panel.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../components/ui/Select.tsx";
import { ApiError, api, apiErrorMessage, type Listing, type RefreshResult, type Source } from "../api.ts";

type Sort = "price" | "sqm" | "firstSeen" | "lastSeen";
type Order = "asc" | "desc";

const SORT_LABELS: Record<Sort, string> = {
  lastSeen: "Sort: last seen",
  firstSeen: "Sort: first seen",
  price: "Sort: price",
  sqm: "Sort: m²",
};

const ORDER_LABELS: Record<Order, string> = {
  desc: "↓ desc",
  asc: "↑ asc",
};

export function ListingsPage({ onSaveLink }: { onSaveLink: (url: string) => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [sort, setSort] = useState<Sort>("lastSeen");
  const [order, setOrder] = useState<Order>("desc");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<RefreshResult | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ error: unknown } | null>(null);
  const [loading, setLoading] = useState(false);

  const sourceLabels = useMemo(
    () =>
      Object.fromEntries([["", "All sources"], ...sources.map((s) => [s.id, s.displayName])]) as Record<string, string>,
    [sources],
  );

  const emptySources = (lastResult?.perSource ?? [])
    .filter((p) => p.ok && p.count === 0)
    .map((p) => sourceLabels[p.id] ?? p.id);

  const reload = async () => {
    setLoading(true);
    try {
      const [ls, ss] = await Promise.all([
        api.listListings({ sort, order, source: sourceFilter || undefined }),
        api.listSources(),
      ]);
      setListings(ls);
      setSources(ss);
      setLoadError(null);
    } catch (error) {
      setLoadError({ error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [sort, order, sourceFilter]);

  // Staleness comes from each source's last run as the API reports it, so a
  // Refresh that fails changes nothing on the rows; it only says so.
  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      setLastResult(await api.refresh());
    } catch (err) {
      setRefreshError(
        err instanceof ApiError && err.status === 409
          ? "Another Refresh is already running. Try again when it has finished."
          : `Refresh failed. ${apiErrorMessage(err)}`,
      );
      return;
    } finally {
      setRefreshing(false);
    }
    await reload();
  };

  const failed = sources.filter((s) => s.enabled && s.lastRunOk === false).map((s) => s.displayName);

  return (
    <Island aria-label="Listings">
      <IslandHead className="max-[820px]:grid max-[820px]:grid-cols-[auto_1fr_auto] max-[820px]:gap-2 max-[820px]:p-3">
        <Button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="max-[820px]:col-start-1 max-[820px]:row-start-1 max-[820px]:h-12 max-[820px]:px-3 max-[820px]:text-lg"
        >
          <Icon name="refresh" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>

        <Select items={sourceLabels} value={sourceFilter} onValueChange={(v) => setSourceFilter(String(v))}>
          <SelectTrigger
            aria-label="Source"
            className="w-56 max-[820px]:col-span-2 max-[820px]:col-start-2 max-[820px]:row-start-1 max-[820px]:h-12 max-[820px]:w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPopup className="min-w-72">
            <SelectItem value="">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id} detail={<LastRun source={s} />}>
                {s.displayName}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <div className="contents max-[820px]:col-span-3 max-[820px]:row-start-2 max-[820px]:grid max-[820px]:grid-cols-[minmax(0,1fr)_96px] max-[820px]:gap-2">
          <Select items={SORT_LABELS} value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger aria-label="Sort by" className="max-[820px]:h-12 max-[820px]:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {(Object.keys(SORT_LABELS) as Sort[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>

          <Select items={ORDER_LABELS} value={order} onValueChange={(v) => setOrder(v as Order)}>
            <SelectTrigger aria-label="Order" className="min-w-[5rem] max-[820px]:h-12 max-[820px]:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {(Object.keys(ORDER_LABELS) as Order[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {ORDER_LABELS[k]}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>

        {failed.length > 0 && (
          <p className="m-0 inline-flex items-center gap-2 text-xs font-bold text-warn max-[820px]:col-span-2 max-[820px]:row-start-3">
            <Icon name="warn" />
            {failed.join(", ")} failed on its last run
          </p>
        )}

        {!loadError && (
          <span className="ml-auto whitespace-nowrap font-medium text-ink-dim max-[820px]:col-start-3 max-[820px]:row-start-3 max-[820px]:ml-0 max-[820px]:justify-self-end">
            {listings.length} listings
          </span>
        )}
      </IslandHead>

      {refreshError && (
        <p role="alert" className="m-3 border border-bad bg-bad-soft px-3 py-2 text-xs text-bad">
          {refreshError}
        </p>
      )}

      {lastResult && (
        <div className="m-3 border border-rule bg-panel px-3 py-2 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {lastResult.perSource.map((p) => {
              const empty = p.ok && p.count === 0;
              return (
                <span key={p.id} className="inline-flex items-center gap-1.5">
                  <Badge tone={!p.ok ? "bad" : empty ? "warn" : "ok"}>
                    {!p.ok ? "failed" : empty ? "empty" : "ok"}
                  </Badge>
                  <span className="text-ink-dim">{p.id}:</span>
                  <span>{p.ok ? p.count : (p.errorMsg ?? "failed")}</span>
                </span>
              );
            })}
          </div>
          {emptySources.length > 0 && (
            <p role="status" className="mt-2 text-warn">
              {emptySources.join(", ")} found no listings. The search URL or the site&apos;s page may have changed;
              check it on Sources. Their earlier listings are not dimmed.
            </p>
          )}
        </div>
      )}

      {loadError ? (
        <div className="p-3">
          <ApiErrorNotice
            action="Couldn't load the listings"
            error={loadError.error}
            onRetry={() => void reload()}
            busy={loading}
          />
        </div>
      ) : (
        <ListingsTable listings={listings} sources={sources} onSave={(l) => onSaveLink(l.url)} />
      )}
    </Island>
  );
}
