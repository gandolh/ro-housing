import type { Listing, Source } from "../api.ts";
import { cn } from "../lib/cn.ts";
import { fmtAge, fmtPrice, fmtPricePerSqm, fmtSqm, isNew } from "../lib/format.ts";
import { useLayout, type Layout } from "../lib/useLayout.ts";
import { Icon } from "./Icon.tsx";
import { PriceHistory } from "./PriceHistory.tsx";
import { VatMarker } from "./VatMarker.tsx";
import { Badge } from "./ui/Badge.tsx";
import { Button } from "./ui/Button.tsx";

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
    // A run that found nothing doesn't count: the site more likely changed than
    // took every listing down at once.
    if (s.lastRunOk && s.lastRunAt !== null && s.lastRunCount !== 0) {
      cutoffs.set(s.id, s.lastRunAt);
    }
  }
  return cutoffs;
}

function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const HEAD = "h-9 whitespace-nowrap border-b border-rule bg-panel-alt px-2 text-left text-xs font-medium text-ink-dim";
const CELL = "h-[52px] px-2 py-[7px] align-middle";
const NUM = `${CELL} whitespace-nowrap text-right`;

/** The ochre dot and the word for a listing first seen two days ago or less. */
function NewMark() {
  return (
    <span className="mr-2 inline-flex items-center gap-[5px] whitespace-nowrap align-[1px] text-xs font-bold text-accent">
      <Icon name="dot" size={8} fill />
      new
    </span>
  );
}

/** The hollow ring before the Age of a row its source's last refresh didn't find. */
function StaleRing() {
  return <Icon name="ring" size={12} className="mr-1 inline align-[-1px] text-ink-dim" />;
}

function title(l: Listing): string {
  return l.title ?? l.sourceUid;
}

interface RowProps {
  listing: Listing;
  stale: boolean;
  onSave: (listing: Listing) => void;
}

function ageTitle(l: Listing, stale: boolean): string {
  return `Last seen ${fmtDateTime(l.lastSeen)}${stale ? ", not found by its source’s last refresh" : ""}`;
}

function SaveButton({ listing, onSave, iconOnly }: Pick<RowProps, "listing" | "onSave"> & { iconOnly?: boolean }) {
  return (
    <Button
      variant="ghost"
      className={cn(iconOnly && "w-10 px-0")}
      aria-label={`Save ${title(listing)} for comparing`}
      onClick={() => onSave(listing)}
    >
      <Icon name="bookmark" />
      <span className={iconOnly ? "sr-only" : undefined}>Save</span>
    </Button>
  );
}

function TitleLink({ listing, className }: { listing: Listing; className?: string }) {
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "break-words underline decoration-rule-soft underline-offset-[3px] hover:decoration-ink hover:decoration-2",
        className,
      )}
    >
      {title(listing)}
    </a>
  );
}

function TableRow({ listing: l, stale, onSave, layout }: RowProps & { layout: Layout }) {
  const full = layout === "full";
  return (
    <tr
      data-stale={stale || undefined}
      className={cn("group border-b border-rule-soft last:border-b-0", stale && "text-ink-dim")}
    >
      <td className={cn(CELL, "pl-4 group-hover:bg-panel-alt")}>
        {isNew(l.firstSeen) && <NewMark />}
        <TitleLink listing={l} />
        {!full && l.location && <div className="mt-0.5 text-xs text-ink-dim">{l.location}</div>}
      </td>
      <td className={cn(CELL, "group-hover:bg-panel-alt")}>
        <Badge>{l.sourceId}</Badge>
      </td>
      <td className={cn(NUM, "group-hover:bg-panel-alt")}>{l.rooms ?? "—"}</td>
      <td className={cn(NUM, "group-hover:bg-panel-alt")}>{fmtSqm(l.sqm)}</td>
      <td className={cn(NUM, "text-lg font-bold group-hover:bg-panel-alt")}>
        {fmtPrice(l.priceEur)}
        <VatMarker show={l.pricePlusVat && l.priceEur !== null} />
      </td>
      <td className={cn(NUM, "group-hover:bg-panel-alt")}>
        {fmtPricePerSqm(l.priceEur, l.sqm)}
        <VatMarker show={l.pricePlusVat && l.priceEur !== null && l.sqm !== null} />
      </td>
      {full && <td className={cn(CELL, "group-hover:bg-panel-alt")}>{l.location ?? "—"}</td>}
      <td className={cn(CELL, "whitespace-nowrap group-hover:bg-panel-alt")} title={ageTitle(l, stale)}>
        {stale && <StaleRing />}
        {fmtAge(l.firstSeen)}
      </td>
      <td className={cn(CELL, "group-hover:bg-panel-alt")}>
        <PriceHistory history={l.history} width={full ? 80 : 72} />
      </td>
      <td className={cn(CELL, "pl-2 pr-4 text-right text-ink group-hover:bg-panel-alt")}>
        <SaveButton listing={l} onSave={onSave} iconOnly={!full} />
      </td>
    </tr>
  );
}

function CardItem({ listing: l, stale, onSave }: RowProps) {
  const dim = stale ? "text-ink-dim" : "";
  return (
    <li
      className={cn("border-b border-rule-soft px-3 pb-2 pt-3 last:border-b-0", stale && "text-ink-dim")}
      data-stale={stale || undefined}
    >
      <div className="flex min-h-7 items-center gap-3">
        <span className="whitespace-nowrap text-xl font-bold">
          {fmtPrice(l.priceEur)}
          <VatMarker show={l.pricePlusVat && l.priceEur !== null} />
        </span>
        <span className={cn("whitespace-nowrap", !stale && "text-ink")}>
          {fmtPricePerSqm(l.priceEur, l.sqm)}
          <VatMarker show={l.pricePlusVat && l.priceEur !== null && l.sqm !== null} />
        </span>
        <span className={cn("ml-auto", dim)}>
          <PriceHistory history={l.history} width={72} />
        </span>
      </div>
      <div className="mt-0.5 text-lg">
        {isNew(l.firstSeen) && <NewMark />}
        <TitleLink listing={l} />
      </div>
      <div className="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2">
        <div className="flex min-w-0 flex-wrap gap-x-3">
          <span>{l.rooms === null ? "—" : `${l.rooms} ${l.rooms === 1 ? "room" : "rooms"}`}</span>
          <span>{fmtSqm(l.sqm)}</span>
          <span className="whitespace-nowrap" title={ageTitle(l, stale)}>
            {stale && <StaleRing />}
            {fmtAge(l.firstSeen)}
          </span>
        </div>
        <Button
          variant="ghost"
          className="col-start-2 row-span-2 row-start-1 h-12 min-w-[72px] border-rule-soft text-ink"
          aria-label={`Save ${title(l)} for comparing`}
          onClick={() => onSave(l)}
        >
          <Icon name="bookmark" />
          Save
        </Button>
        <div className="flex min-h-7 min-w-0 flex-wrap items-center gap-x-3">
          {l.location && <span>{l.location}</span>}
          <Badge>{l.sourceId}</Badge>
        </div>
      </div>
    </li>
  );
}

/** The key under the table: what the ring and the dot mean. */
function Key() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-rule bg-panel-alt px-4 py-2.5 text-xs font-medium text-ink-dim">
      <span className="inline-flex items-center">
        <Icon name="ring" size={12} className="mr-1 shrink-0" />
        Dimmed: not found by its source’s last refresh.
      </span>
      <span className="inline-flex items-center">
        <Icon name="dot" size={8} fill className="mr-1.5 shrink-0 text-accent" />
        new: first seen 2 days ago or less. A row can be both new and dimmed.
      </span>
    </div>
  );
}

const COLS: Record<"full" | "mid", number[]> = {
  full: [0, 104, 48, 68, 108, 104, 152, 76, 100, 88],
  mid: [0, 96, 48, 68, 108, 104, 84, 88, 60],
};

export function ListingsTable({ listings, sources, onSave }: Props) {
  const layout = useLayout();
  if (listings.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-base text-ink-dim">
        No listings yet. Configure source URLs and click Refresh.
      </p>
    );
  }
  const cutoffs = staleCutoffs(sources, listings);
  const rows = listings.map((l) => {
    const cutoff = cutoffs.get(l.sourceId);
    return { l, stale: cutoff !== undefined && l.lastSeen < cutoff - STALE_MARGIN_MS };
  });
  if (layout === "cards") {
    return (
      <>
        <ul className="m-0 grid list-none grid-cols-1 p-0 min-[640px]:grid-cols-2 min-[640px]:[&>li:nth-child(odd)]:border-r min-[640px]:[&>li:nth-child(odd)]:border-r-rule-soft">
          {rows.map(({ l, stale }) => (
            <CardItem key={l.id} listing={l} stale={stale} onSave={onSave} />
          ))}
        </ul>
        <Key />
      </>
    );
  }
  return (
    <>
      <table className="w-full table-fixed">
        <colgroup>
          {COLS[layout].map((w, i) => (
            <col key={i} style={w ? { width: w } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className={cn(HEAD, "pl-4")}>Title</th>
            <th className={HEAD}>Source</th>
            <th className={cn(HEAD, "text-right")}>Rooms</th>
            <th className={cn(HEAD, "text-right")}>m²</th>
            <th className={cn(HEAD, "text-right")}>Price</th>
            <th className={cn(HEAD, "text-right")}>€/m²</th>
            {layout === "full" && <th className={HEAD}>Location</th>}
            <th className={HEAD}>Age</th>
            <th className={HEAD}>History</th>
            <th className={cn(HEAD, "pr-4")}>
              <span className="sr-only">Save</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ l, stale }) => (
            <TableRow key={l.id} listing={l} stale={stale} onSave={onSave} layout={layout} />
          ))}
        </tbody>
      </table>
      <Key />
    </>
  );
}
