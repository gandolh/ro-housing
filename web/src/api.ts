export interface Source {
  id: string;
  displayName: string;
  searchUrl: string | null;
  enabled: boolean;
  lastRunAt: number | null;
  lastRunOk: boolean | null;
}

export interface Listing {
  id: number;
  sourceId: string;
  sourceUid: string;
  url: string;
  title: string | null;
  priceEur: number | null;
  rooms: number | null;
  sqm: number | null;
  location: string | null;
  firstSeen: number;
  lastSeen: number;
  history: { observedAt: number; priceEur: number | null }[];
}

export interface RefreshResult {
  perSource: {
    id: string;
    ok: boolean;
    count: number;
    errorMsg?: string;
  }[];
}

export const PARTITIONINGS = [
  'decomandat',
  'semidecomandat',
  'nedecomandat',
  'circular',
] as const;
export type Partitioning = (typeof PARTITIONINGS)[number];

/** The facts about one apartment that a listing page can carry. */
export interface ApartmentFields {
  title: string | null;
  priceEur: number | null;
  rooms: number | null;
  sqm: number | null;
  /** 0 = parter, -1 = demisol. */
  floor: number | null;
  floorsTotal: number | null;
  yearBuilt: number | null;
  location: string | null;
  partitioning: Partitioning | null;
  imageUrl: string | null;
}

export interface SavedInput extends ApartmentFields {
  url: string;
  notes: string | null;
}

export interface SavedApartment extends SavedInput {
  id: number;
  site: string;
  fetchedAt: number | null;
  savedAt: number;
  updatedAt: number;
}

export interface ScrapeResult {
  url: string;
  site: string;
  /** Set when this link is already saved; nothing was fetched. */
  existing: SavedApartment | null;
  draft: ApartmentFields | null;
  found: (keyof ApartmentFields)[];
  via: 'fetch' | 'browser' | null;
  problem: {
    kind: 'blocked' | 'not_found' | 'unreachable';
    message: string;
  } | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public payload: { error?: string } | null,
  ) {
    super(payload?.error ?? `HTTP ${status}`);
  }
}

const UNREACHABLE = "Can't reach the API: is it running?";

/** Why a call to the API failed, as a sentence. fetch rejects with a
 *  TypeError when nothing answers at all; Vite's proxy answers 502 (older
 *  Vites 500), with no JSON body, when the API itself is not running. Else the
 *  API's own error ("a refresh is already running") or "HTTP 500". */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof TypeError) return UNREACHABLE;
  if (err instanceof ApiError) {
    const proxy = !err.payload && (err.status === 500 || (err.status >= 502 && err.status <= 504));
    if (proxy) return UNREACHABLE;
  }
  const text = err instanceof Error ? err.message : String(err);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function jsonOrApiError<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let payload: { error?: string } | null = null;
  try {
    payload = (await res.json()) as { error?: string };
  } catch {
    payload = null;
  }
  throw new ApiError(res.status, payload);
}

export const api = {
  listSources: () => fetch('/api/sources').then(jsonOrApiError<Source[]>),
  updateSource: (
    id: string,
    patch: { searchUrl?: string | null; enabled?: boolean },
  ) =>
    fetch(`/api/sources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(jsonOrApiError<{ ok: true }>),
  listListings: (params: {
    sort?: 'price' | 'sqm' | 'firstSeen' | 'lastSeen';
    order?: 'asc' | 'desc';
    source?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.sort) q.set('sort', params.sort);
    if (params.order) q.set('order', params.order);
    if (params.source) q.set('source', params.source);
    return fetch(`/api/listings?${q}`).then(jsonOrApiError<Listing[]>);
  },
  refresh: () =>
    fetch('/api/refresh', { method: 'POST' }).then(jsonOrApiError<RefreshResult>),
  scrapeLink: (url: string) =>
    fetch('/api/saved/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).then(jsonOrApiError<ScrapeResult>),
  listSaved: () => fetch('/api/saved').then(jsonOrApiError<SavedApartment[]>),
  createSaved: (input: SavedInput) =>
    fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(jsonOrApiError<SavedApartment>),
  updateSaved: (id: number, input: SavedInput) =>
    fetch(`/api/saved/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then(jsonOrApiError<SavedApartment>),
  deleteSaved: async (id: number) => {
    const res = await fetch(`/api/saved/${id}`, { method: 'DELETE' });
    if (!res.ok) await jsonOrApiError<never>(res);
  },
  getIssuesStatus: () =>
    fetch('/api/issues').then(jsonOrApiError<{ count: number; max: number }>),
  submitIssue: (body: string) =>
    fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    }).then(jsonOrApiError<{ id: string; count: number; max: number }>),
};
