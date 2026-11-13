import { useState } from "react";
import type { SavedApartment } from "../api.ts";
import { cn } from "../lib/cn.ts";
import { fmtFloor, fmtPrice, fmtPricePerSqm, fmtSqm } from "../lib/format.ts";
import { useLayout } from "../lib/useLayout.ts";
import { Icon } from "./Icon.tsx";
import { VatMarker } from "./VatMarker.tsx";
import { Badge } from "./ui/Badge.tsx";
import { Button } from "./ui/Button.tsx";

interface Props {
  saved: SavedApartment[];
  onEdit: (s: SavedApartment) => void;
  onDelete: (s: SavedApartment) => Promise<void>;
}

const HEAD = "h-9 whitespace-nowrap border-b border-rule bg-panel-alt px-2 text-left text-xs font-medium text-ink-dim";
const CELL = "px-2 py-[7px] align-middle";
const NUM = `${CELL} whitespace-nowrap text-right`;
const COLS = [64, 0, 104, 100, 64, 52, 52, 56, 116, 176];

function Thumb({ s }: { s: SavedApartment }) {
  return s.imageUrl ? (
    <img
      src={s.imageUrl}
      alt=""
      referrerPolicy="no-referrer"
      loading="lazy"
      className="h-9 w-12 border border-rule-soft object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-9 w-12 items-center justify-center border border-rule-soft bg-panel-alt text-ink-dim"
    >
      <Icon name="image" />
    </span>
  );
}

function TitleLink({ s, className }: { s: SavedApartment; className?: string }) {
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "break-words underline decoration-rule-soft underline-offset-[3px] hover:decoration-ink hover:decoration-2",
        className,
      )}
    >
      {s.title ?? s.url}
    </a>
  );
}

/** Edit and Delete, and Delete's own "Delete it / Keep" ask. `phone` makes them 48 px icon buttons. */
function Actions({
  s,
  confirming,
  setConfirming,
  onEdit,
  onDelete,
  phone,
}: {
  s: SavedApartment;
  confirming: boolean;
  setConfirming: (id: number | null) => void;
  onEdit: (s: SavedApartment) => void;
  onDelete: (s: SavedApartment) => Promise<void>;
  phone?: boolean;
}) {
  const size = phone ? "h-12 w-12 border-rule-soft px-0" : "";
  if (confirming) {
    return (
      <>
        <Button
          variant="ghost"
          className={cn("text-bad", phone && "h-12")}
          onClick={() => {
            void (async () => {
              await onDelete(s);
              setConfirming(null);
            })();
          }}
        >
          Delete it
        </Button>
        <Button variant="ghost" className={cn(phone && "h-12")} onClick={() => setConfirming(null)}>
          Keep
        </Button>
      </>
    );
  }
  return (
    <>
      <Button variant="ghost" className={size} aria-label={`Edit ${s.title ?? s.url}`} onClick={() => onEdit(s)}>
        <Icon name="pencil" />
        {!phone && "Edit"}
      </Button>
      <Button
        variant="ghost"
        className={size}
        aria-label={`Delete ${s.title ?? s.url}`}
        onClick={() => setConfirming(s.id)}
      >
        <Icon name="trash" />
        {!phone && "Delete"}
      </Button>
    </>
  );
}

export function SavedTable({ saved, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const layout = useLayout();

  if (saved.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-base text-ink-dim">
        Nothing saved yet. Paste a listing link above and click Fetch details.
      </p>
    );
  }

  if (layout !== "full") {
    return (
      <ul className="m-0 grid list-none grid-cols-1 p-0 min-[640px]:grid-cols-2 min-[640px]:[&>li:nth-child(odd)]:border-r min-[640px]:[&>li:nth-child(odd)]:border-r-rule-soft">
        {saved.map((s) => (
          <li key={s.id} className="border-b border-rule-soft px-3 pb-1 pt-3 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-h-7 flex-wrap items-center gap-x-3">
                <span className="whitespace-nowrap text-xl font-bold">
                  {fmtPrice(s.priceEur)}
                  <VatMarker show={s.pricePlusVat && s.priceEur !== null} />
                </span>
                <span className="whitespace-nowrap text-ink-dim">
                  {fmtPricePerSqm(s.priceEur, s.sqm)}
                  <VatMarker show={s.pricePlusVat && s.priceEur !== null && s.sqm !== null} />
                </span>
              </div>
              <Thumb s={s} />
            </div>
            <div className="mt-0.5 text-lg">
              <TitleLink s={s} />
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3">
              <span>{s.rooms === null ? "—" : `${s.rooms} ${s.rooms === 1 ? "room" : "rooms"}`}</span>
              <span>{fmtSqm(s.sqm)}</span>
              <span>floor {fmtFloor(s.floor, s.floorsTotal)}</span>
              <span>built {s.yearBuilt ?? "—"}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 text-ink-dim">
              {s.location && <span>{s.location}</span>}
              {s.partitioning && <span>{s.partitioning}</span>}
            </div>
            {s.notes && <p className="m-0 mt-1 text-ink-dim">{s.notes}</p>}
            <div className="mb-1 mt-2 flex items-center gap-2">
              <Badge className="mr-auto">{s.site}</Badge>
              <Actions
                s={s}
                confirming={confirming === s.id}
                setConfirming={setConfirming}
                onEdit={onEdit}
                onDelete={onDelete}
                phone
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <table className="w-full table-fixed">
      <colgroup>
        {COLS.map((w, i) => (
          <col key={i} style={w ? { width: w } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className={cn(HEAD, "pl-4")}>
            <span className="sr-only">Photo</span>
          </th>
          <th className={HEAD}>Apartment</th>
          <th className={cn(HEAD, "text-right")}>Price</th>
          <th className={cn(HEAD, "text-right")}>€/m²</th>
          <th className={cn(HEAD, "text-right")}>m²</th>
          <th className={cn(HEAD, "text-right")}>Rooms</th>
          <th className={cn(HEAD, "text-right")}>Floor</th>
          <th className={cn(HEAD, "text-right")}>Built</th>
          <th className={HEAD}>Area</th>
          <th className={cn(HEAD, "pr-4")}>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {saved.map((s) => (
          <tr key={s.id} className="group border-b border-rule-soft last:border-b-0 hover:bg-panel-alt">
            <td className={cn(CELL, "pl-4")}>
              <Thumb s={s} />
            </td>
            <td className={CELL}>
              <TitleLink s={s} />
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-dim">
                <Badge className="text-ink">{s.site}</Badge>
                {s.partitioning && <span>{s.partitioning}</span>}
              </div>
              {s.notes && <p className="m-0 mt-1 line-clamp-2 text-xs text-ink-dim">{s.notes}</p>}
            </td>
            <td className={cn(NUM, "text-lg font-bold")}>
              {fmtPrice(s.priceEur)}
              <VatMarker show={s.pricePlusVat && s.priceEur !== null} />
            </td>
            <td className={NUM}>
              {fmtPricePerSqm(s.priceEur, s.sqm)}
              <VatMarker show={s.pricePlusVat && s.priceEur !== null && s.sqm !== null} />
            </td>
            <td className={NUM}>{fmtSqm(s.sqm)}</td>
            <td className={NUM}>{s.rooms ?? "—"}</td>
            <td className={NUM}>{fmtFloor(s.floor, s.floorsTotal)}</td>
            <td className={NUM}>{s.yearBuilt ?? "—"}</td>
            <td className={CELL}>{s.location ?? "—"}</td>
            <td className={cn(CELL, "pr-4")}>
              <div className="flex justify-end gap-0.5">
                <Actions
                  s={s}
                  confirming={confirming === s.id}
                  setConfirming={setConfirming}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
