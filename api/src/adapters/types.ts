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
  scrape(searchUrl: string): Promise<ScrapedListing[]>;
}
