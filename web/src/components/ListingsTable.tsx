import type { Listing, Source } from '../api.ts';
import { cn } from '../lib/cn.ts';
import { fmtPrice, fmtPricePerSqm, fmtSqm } from '../lib/format.ts';
import { PriceHistory } from './PriceHistory.tsx';
import { VatMarker } from './VatMarker.tsx';
import { Badge } from './ui/Badge.tsx';
import { Button } from './ui/Button.tsx';
import { Panel } from './ui/Panel.tsx';

interface Props {
  listings: Listing[];
  /** Each source's last run, which says which of its listings are stale. */
  sources: Source[];
  /** Opens the listing in the Saved tab's fetch-and-confirm flow. */
  onSave: (listing: Listing) => void;
}

/** Rows from one run share its timestamp, and the source's run is stamped just
 *  after them; the margin absorbs that gap and some clock skew. */
const STALE_MARGIN_MS = 5_000;

/** For each source, the time of its last successful run that found anything:
 *  the run itself when the last run succeeded, else its newest `lastSeen`.
 *  A listing seen before that is stale, likely delisted. */
export function staleCutoffs(sources: Source[], listings: Listing[]): Map<string, number> {
  const cutoffs = new Map<string, number>();
  for (const l of listings) {
    cutoffs.set(l.sourceId, Math.max(cutoffs.get(l.sourceId) ?? 0, l.lastSeen));
  }
  for (const s of sources) {
    if (s.lastRunOk && s.lastRunAt !== null) cutoffs.set(s.id, s.lastRunAt);
  }
  return cutoffs;
}

function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtAge(firstSeen: number): string {
  const days = Math.floor((Date.now() - firstSeen) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  return `${days}d`;
}

const HEAD = 'border-b border-ink bg-panel-alt px-2 py-1.5 text-xs uppercase tracking-wide text-ink-dim text-left';

export function ListingsTable({ listings, sources, onSave }: Props) {
  if (listings.length === 0) {
    return (
      <Panel className="px-6 py-12 text-center text-sm text-ink-dim">
        No listings yet. Configure source URLs and click Refresh.
      </Panel>
    );
  }
  const cutoffs = staleCutoffs(sources, listings);
  return (
    <Panel>
      <table className="w-full">
        <thead>
          <tr>
            <th className={HEAD}>Title</th>
            <th className={HEAD}>Source</th>
            <th className={HEAD}>Rooms</th>
            <th className={HEAD}>m²</th>
            <th className={HEAD}>Price</th>
            <th className={HEAD}>€/m²</th>
            <th className={HEAD}>Location</th>
            <th className={HEAD}>Age</th>
            <th className={HEAD}>History</th>
            <th className={HEAD}>
              <span className="sr-only">Save</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => {
            const cutoff = cutoffs.get(l.sourceId);
            const stale = cutoff !== undefined && l.lastSeen < cutoff - STALE_MARGIN_MS;
            return (
              <tr
                key={l.id}
                data-stale={stale || undefined}
                className={cn(
                  'border-b border-rule-soft last:border-b-0',
                  stale && 'text-ink-faint',
                )}
              >
                <td className="px-2 py-1.5">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:decoration-2"
                  >
                    {l.title ?? l.sourceUid}
                  </a>
                </td>
                <td className="px-2 py-1.5">
                  <Badge>{l.sourceId}</Badge>
                </td>
                <td className="px-2 py-1.5">{l.rooms ?? '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5">{fmtSqm(l.sqm)}</td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {fmtPrice(l.priceEur)}
                  <VatMarker show={l.pricePlusVat && l.priceEur !== null} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {fmtPricePerSqm(l.priceEur, l.sqm)}
                  <VatMarker show={l.pricePlusVat && l.priceEur !== null && l.sqm !== null} />
                </td>
                <td className="px-2 py-1.5">{l.location ?? '—'}</td>
                <td
                  className="px-2 py-1.5"
                  title={`Last seen ${fmtDateTime(l.lastSeen)}${
                    stale ? ', not found by its source’s last refresh' : ''
                  }`}
                >
                  {fmtAge(l.firstSeen)}
                </td>
                <td className="px-2 py-1.5">
                  <PriceHistory history={l.history} />
                </td>
                <td className="px-1 py-1.5">
                  <Button
                    variant="ghost"
                    className="h-auto px-1 text-xs"
                    aria-label={`Save ${l.title ?? l.sourceUid} for comparing`}
                    onClick={() => onSave(l)}
                  >
                    save
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
