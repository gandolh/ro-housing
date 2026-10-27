/** "+TVA" beside a price the page gave before VAT, and beside the €/m² worked
 *  out from it, so it is not compared as if it were a price with VAT. Adding
 *  the VAT (21%, or 9% for a first home under the cap) is left to the reader. */
export function VatMarker({ show }: { show: boolean | null | undefined }) {
  if (!show) return null;
  return (
    <span className="ml-1 text-xs text-warn" title="Before VAT (TVA): the page gives this price without it">
      +TVA
    </span>
  );
}
