import { useEffect, useMemo, useState } from 'react';
import { ListingsTable } from '../components/ListingsTable.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Button } from '../components/ui/Button.tsx';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValueLabel,
} from '../components/ui/Select.tsx';
import { ApiError, api, type Listing, type RefreshResult, type Source } from '../api.ts';

type Sort = 'price' | 'sqm' | 'firstSeen' | 'lastSeen';
type Order = 'asc' | 'desc';

const SORT_LABELS: Record<Sort, string> = {
  lastSeen: 'Sort: last seen',
  firstSeen: 'Sort: first seen',
  price: 'Sort: price',
  sqm: 'Sort: m²',
};

const ORDER_LABELS: Record<Order, string> = {
  desc: '↓ desc',
  asc: '↑ asc',
};

export function ListingsPage({ onSaveLink }: { onSaveLink: (url: string) => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [sort, setSort] = useState<Sort>('lastSeen');
  const [order, setOrder] = useState<Order>('desc');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastResult, setLastResult] = useState<RefreshResult | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const sourceLabels = useMemo(
    () =>
      Object.fromEntries([
        ['', 'All sources'],
        ...sources.map((s) => [s.id, s.displayName]),
      ]) as Record<string, string>,
    [sources],
  );

  const reload = async () => {
    const [ls, ss] = await Promise.all([
      api.listListings({ sort, order, source: sourceFilter || undefined }),
      api.listSources(),
    ]);
    setListings(ls);
    setSources(ss);
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
      const result = await api.refresh();
      setLastResult(result);
      await reload();
    } catch (err) {
      setRefreshError(
        err instanceof ApiError && err.status === 409
          ? 'Another Refresh is already running. Try again when it has finished.'
          : `Refresh failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>

        <Select
          value={sourceFilter}
          onValueChange={(v) => setSourceFilter(String(v))}
        >
          <SelectTrigger>
            <SelectValueLabel labels={sourceLabels} placeholder="All sources" />
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value="">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.displayName}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger>
            <SelectValueLabel labels={SORT_LABELS} />
          </SelectTrigger>
          <SelectPopup>
            {(Object.keys(SORT_LABELS) as Sort[]).map((k) => (
              <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <Select value={order} onValueChange={(v) => setOrder(v as Order)}>
          <SelectTrigger className="min-w-[5rem]">
            <SelectValueLabel labels={ORDER_LABELS} />
          </SelectTrigger>
          <SelectPopup>
            {(Object.keys(ORDER_LABELS) as Order[]).map((k) => (
              <SelectItem key={k} value={k}>{ORDER_LABELS[k]}</SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <span className="ml-auto text-xs uppercase tracking-wide text-ink-dim">
          {listings.length} listings
        </span>
      </div>

      {refreshError && (
        <p role="alert" className="mt-3 border border-bad bg-bad-soft px-2 py-1.5 text-xs text-bad">
          {refreshError}
        </p>
      )}

      {lastResult && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border border-ink bg-panel px-3 py-2 text-xs">
          {lastResult.perSource.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5">
              <Badge tone={p.ok ? 'ok' : 'bad'}>{p.ok ? 'OK' : 'FAIL'}</Badge>
              <span className="text-ink-dim">{p.id}:</span>
              <span>{p.ok ? p.count : (p.errorMsg ?? 'failed')}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ListingsTable
          listings={listings}
          sources={sources}
          onSave={(l) => onSaveLink(l.url)}
        />
      </div>
    </div>
  );
}
