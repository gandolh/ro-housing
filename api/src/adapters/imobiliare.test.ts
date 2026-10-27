import { describe, expect, it, vi } from 'vitest';

// Two made-up cards shaped like imobiliare.ro's search results (the site has
// answered with a bot check since 2026-10-16, so there is no real page to
// keep): a discounted flat with its crossed-out old price, a developer's card
// with a discount blurb before the price, and a new build priced before VAT.
const SEARCH_PAGE = `
<html><body>
  <article class="listing-card">
    <a href="/oferta/apartament-de-vanzare-timisoara-lipovei-2-camere-275346765">
      <h2>Apartament 2 camere zona X</h2>
    </a>
    <span>2 camere</span> <span>54 mp</span>
    <span class="price">109.000 €</span>
    <s>131.890 €</s>
    <span>Preț vechi 131.890 €</span>
  </article>
  <article class="listing-card">
    <a href="/oferta/apartament-de-vanzare-timisoara-aradului-3-camere-271420872">
      <h2>Dezvoltator -3% Discount aplicat: Ap si Boxă</h2>
    </a>
    <span>+ 2000 € Discount la parcare | Oferta limitata!</span>
    <span>111.359 €</span> <span>92.033 € +TVA</span>
    <span>3 camere</span> <span>72 mp</span>
  </article>
  <article class="listing-card">
    <a href="/oferta/apartament-de-vanzare-timisoara-torontalului-2-camere-280000001">
      <h2>Apartament nou 2 camere</h2>
    </a>
    <span>2 camere</span> <span>51 mp</span>
    <span>92.033 € + TVA</span>
  </article>
</body></html>`;

vi.mock('../lib/fetch.ts', () => ({
  createSession: () => ({ get: async () => SEARCH_PAGE }),
}));

const { imobiliareAdapter } = await import('./imobiliare.ts');

describe('imobiliareAdapter', () => {
  it('takes the price, not the crossed-out old one or the discount, and its VAT mark', async () => {
    const rows = await imobiliareAdapter.scrape('https://www.imobiliare.ro/vanzare-apartamente/timisoara');
    expect(
      rows.map((r) => [r.sourceUid, r.priceEur, r.pricePlusVat, r.rooms, r.sqm, r.location]),
    ).toEqual([
      ['apartament-de-vanzare-timisoara-lipovei-2-camere-275346765', 109000, false, 2, 54, 'lipovei'],
      ['apartament-de-vanzare-timisoara-aradului-3-camere-271420872', 111359, false, 3, 72, 'aradului'],
      ['apartament-de-vanzare-timisoara-torontalului-2-camere-280000001', 92033, true, 2, 51, 'torontalului'],
    ]);
  });
});
