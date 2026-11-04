export interface ScrapedListing {
  sourceUid: string;
  url: string;
  title?: string;
  priceEur?: number;
  /** The card marks the price as before VAT ("+ TVA", "fără TVA"). */
  pricePlusVat?: boolean;
  rooms?: number;
  sqm?: number;
  location?: string;
  raw: Record<string, unknown>;
}

export interface Adapter {
  id: string;
  displayName: string;
  /** The search URL a new database starts with, for a source whose URL is
   *  fixed (a feed). Most sources start empty and the user pastes one. */
  defaultSearchUrl?: string;
  scrape(searchUrl: string): Promise<ScrapedListing[]>;
}
