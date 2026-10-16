export function fmtPrice(eur: number | null): string {
  if (eur === null) return '—';
  return `${eur.toLocaleString('ro-RO')} €`;
}

export function fmtSqm(sqm: number | null): string {
  if (sqm === null) return '—';
  return `${sqm} m²`;
}

export function pricePerSqm(price: number | null, sqm: number | null): number | null {
  if (price === null || sqm === null || sqm === 0) return null;
  return Math.round(price / sqm);
}

export function fmtPricePerSqm(price: number | null, sqm: number | null): string {
  const v = pricePerSqm(price, sqm);
  return v === null ? '—' : `${v.toLocaleString('ro-RO')} €/m²`;
}

/** 0 → "P" (parter), -1 → "D" (demisol), else the number. */
export function floorLabel(floor: number): string {
  if (floor === 0) return 'P';
  if (floor < 0) return 'D';
  return String(floor);
}

/** "3/4", "P/4", "3", "—/4", "—". */
export function fmtFloor(floor: number | null, total: number | null): string {
  if (floor === null && total === null) return '—';
  const f = floor === null ? '—' : floorLabel(floor);
  return total === null ? f : `${f}/${total}`;
}
