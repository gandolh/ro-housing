export interface ScrapedListing {
  sourceUid: string;
  url: string;
  title?: string;
  priceEur?: number;
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
