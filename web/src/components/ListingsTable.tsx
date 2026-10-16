import type { Listing } from '../api.ts';
import { cn } from '../lib/cn.ts';
import { fmtPrice, fmtPricePerSqm, fmtSqm } from '../lib/format.ts';
import { PriceHistory } from './PriceHistory.tsx';
import { Badge } from './ui/Badge.tsx';
import { Button } from './ui/Button.tsx';
import { Panel } from './ui/Panel.tsx';

interface Props {
  listings: Listing[];
  lastRefreshAt: number | null;
  /** Opens the listing in the Saved tab's fetch-and-confirm flow. */
  onSave: (listing: Listing) => void;
}

function fmtAge(firstSeen: number): string {
  const days = Math.floor((Date.now() - firstSeen) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  return `${days}d`;
}

const HEAD = 'border-b border-ink bg-panel-alt px-2 py-1.5 text-xs uppercase tracking-wide text-ink-dim text-left';

export function ListingsTable({ listings, lastRefreshAt, onSave }: Props) {
  if (listings.length === 0) {
    return (
      <Panel className="px-6 py-12 text-center text-sm text-ink-dim">
        No listings yet. Configure source URLs and click Refresh.
      </Panel>
    );
  }
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
            const stale =
              lastRefreshAt !== null && l.lastSeen < lastRefreshAt - 5_000;
            return (
              <tr
                key={l.id}
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
                <td className="px-2 py-1.5">{fmtSqm(l.sqm)}</td>
                <td className="px-2 py-1.5">{fmtPrice(l.priceEur)}</td>
                <td className="px-2 py-1.5">
                  {fmtPricePerSqm(l.priceEur, l.sqm)}
                </td>
                <td className="px-2 py-1.5">{l.location ?? '—'}</td>
                <td className="px-2 py-1.5">{fmtAge(l.firstSeen)}</td>
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
