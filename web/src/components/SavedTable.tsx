import { useState } from 'react';
import type { SavedApartment } from '../api.ts';
import { fmtFloor, fmtPrice, fmtPricePerSqm, fmtSqm } from '../lib/format.ts';
import { VatMarker } from './VatMarker.tsx';
import { Badge } from './ui/Badge.tsx';
import { Button } from './ui/Button.tsx';
import { Panel } from './ui/Panel.tsx';

interface Props {
  saved: SavedApartment[];
  onEdit: (s: SavedApartment) => void;
  onDelete: (s: SavedApartment) => Promise<void>;
}

const HEAD =
  'border-b border-ink bg-panel-alt px-2 py-1.5 text-xs uppercase tracking-wide text-ink-dim text-left';
const CELL = 'px-2 py-1.5 align-top';
const NUM = `${CELL} whitespace-nowrap`;

export function SavedTable({ saved, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState<number | null>(null);

  if (saved.length === 0) {
    return (
      <Panel className="px-6 py-12 text-center text-sm text-ink-dim">
        Nothing saved yet. Paste a listing link above and click Fetch details.
      </Panel>
    );
  }

  return (
    <Panel>
      <table className="w-full">
        <thead>
          <tr>
            <th className={HEAD}>
              <span className="sr-only">Photo</span>
            </th>
            <th className={HEAD}>Apartment</th>
            <th className={HEAD}>Price</th>
            <th className={HEAD}>€/m²</th>
            <th className={HEAD}>m²</th>
            <th className={HEAD}>Rooms</th>
            <th className={HEAD}>Floor</th>
            <th className={HEAD}>Built</th>
            <th className={HEAD}>Area</th>
            <th className={HEAD}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {saved.map((s) => (
            <tr key={s.id} className="border-b border-rule-soft last:border-b-0">
              <td className={CELL}>
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-9 w-12 border border-rule-soft object-cover"
                  />
                ) : (
                  <div className="h-9 w-12 border border-rule-soft bg-panel-alt" />
                )}
              </td>
              <td className={CELL}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:decoration-2"
                >
                  {s.title ?? s.url}
                </a>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-dim">
                  <Badge>{s.site}</Badge>
                  {s.partitioning && <span>{s.partitioning}</span>}
                </div>
                {s.notes && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-dim">{s.notes}</p>
                )}
              </td>
              <td className={NUM}>
                {fmtPrice(s.priceEur)}
                <VatMarker show={s.pricePlusVat && s.priceEur !== null} />
              </td>
              <td className={NUM}>
                {fmtPricePerSqm(s.priceEur, s.sqm)}
                <VatMarker show={s.pricePlusVat && s.priceEur !== null && s.sqm !== null} />
              </td>
              <td className={NUM}>{fmtSqm(s.sqm)}</td>
              <td className={CELL}>{s.rooms ?? '—'}</td>
              <td className={NUM}>{fmtFloor(s.floor, s.floorsTotal)}</td>
              <td className={CELL}>{s.yearBuilt ?? '—'}</td>
              <td className={CELL}>{s.location ?? '—'}</td>
              <td className={`${CELL} whitespace-nowrap text-right`}>
                {confirming === s.id ? (
                  <>
                    <Button
                      variant="ghost"
                      className="px-1.5 text-bad"
                      onClick={async () => {
                        await onDelete(s);
                        setConfirming(null);
                      }}
                    >
                      Delete it
                    </Button>
                    <Button variant="ghost" className="px-1.5" onClick={() => setConfirming(null)}>
                      Keep
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="px-1.5" onClick={() => onEdit(s)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-1.5"
                      aria-label={`Delete ${s.title ?? s.url}`}
                      onClick={() => setConfirming(s.id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
