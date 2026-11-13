export function fmtPrice(eur: number | null): string {
  if (eur === null) return "—";
  return `${eur.toLocaleString("ro-RO")} €`;
}

export function fmtSqm(sqm: number | null): string {
  if (sqm === null) return "—";
  return `${sqm} m²`;
}

export function pricePerSqm(price: number | null, sqm: number | null): number | null {
  if (price === null || sqm === null || sqm === 0) return null;
  return Math.round(price / sqm);
}

export function fmtPricePerSqm(price: number | null, sqm: number | null): string {
  const v = pricePerSqm(price, sqm);
  return v === null ? "—" : `${v.toLocaleString("ro-RO")} €/m²`;
}

/** 0 → "P" (parter), -1 → "D" (demisol), else the number. */
export function floorLabel(floor: number): string {
  if (floor === 0) return "P";
  if (floor < 0) return "D";
  return String(floor);
}

/** "3/4", "P/4", "3", "—/4", "—". */
export function fmtFloor(floor: number | null, total: number | null): string {
  if (floor === null && total === null) return "—";
  const f = floor === null ? "—" : floorLabel(floor);
  return total === null ? f : `${f}/${total}`;
}

/** "never", "just now", "5m ago", "3h ago", "2d ago": how long ago a source last ran. */
export function fmtWhen(ts: number | null): string {
  if (ts === null) return "never";
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const DAY_MS = 86_400_000;

/** Whole days since a listing was first seen. */
function ageDays(firstSeen: number): number {
  return Math.floor((Date.now() - firstSeen) / DAY_MS);
}

/** "today", "1d", "20d". */
export function fmtAge(firstSeen: number): string {
  const days = ageDays(firstSeen);
  return days === 0 ? "today" : `${days}d`;
}

/** A listing is new when it was first seen two days ago or less: the same day count the Age column shows. */
export function isNew(firstSeen: number): boolean {
  return ageDays(firstSeen) <= 2;
}
