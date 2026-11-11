import { API_BASE } from "./base.ts";

export interface Source {
  id: string;
  displayName: string;
  searchUrl: string | null;
  enabled: boolean;
  lastRunAt: number | null;
  lastRunOk: boolean | null;
  /** Listings the last successful run returned: 0 means it found none, which
   *  usually means the site changed. Null after a failed run or before the
   *  API kept count. */
  lastRunCount: number | null;
}

export interface Listing {
  id: number;
  sourceId: string;
  sourceUid: string;
  url: string;
  title: string | null;
  priceEur: number | null;
  /** The card gave the price before VAT ("+ TVA"). */
  pricePlusVat: boolean;
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
    /** Set when the run worked but found no listings. */
    warning?: string;
  }[];
}

export const PARTITIONINGS = ["decomandat", "semidecomandat", "nedecomandat", "circular"] as const;
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
  /** The price is before VAT ("+ TVA", "fără TVA"). Part of the price, not
   *  one of the counted fields. */
  pricePlusVat: boolean | null;
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
  via: "fetch" | "browser" | null;
  problem: {
    kind: "blocked" | "not_found" | "unreachable";
    message: string;
  } | null;
  /** "Fill the gaps" is on (the server has Wicket's settings). */
  fillable?: boolean;
}

/** The fields "Fill the gaps" may ask the model for: the ten a page can give. */
export type FillField = Exclude<keyof ApartmentFields, "pricePlusVat">;

/** A "Fill the gaps" job, as ro-housing's API passes Wicket's on. */
export interface FillJob {
  id: string;
  /** Wicket's ticket line: this job's number and the one running now. */
  ticket?: number;
  nowServing?: number;
  position?: number;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  /** On `done`: the values the model gave for the asked fields, checked. */
  values?: Partial<ApartmentFields>;
  model?: string;
  /** On `failed` or `cancelled`: why. */
  error?: string | null;
}

export class ApiError extends Error {
  status: number;
  payload: { error?: string } | null;

  constructor(status: number, payload: { error?: string } | null) {
    super(payload?.error ?? `HTTP ${status}`);
    this.status = status;
    this.payload = payload;
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

const unauthorizedListeners = new Set<() => void>();

/** Hear of every 401: the session ended (or never was). auth.ts asks the
 *  server again, and the gate shows the login page. Returns an unsubscribe. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

/** A call to the API, under its browser-visible prefix (base.ts). */
function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, init);
}

async function jsonOrApiError<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  if (res.status === 401) for (const listener of unauthorizedListeners) listener();
  let payload: { error?: string } | null;
  try {
    payload = (await res.json()) as { error?: string };
  } catch {
    payload = null;
  }
  throw new ApiError(res.status, payload);
}

export const api = {
  listSources: () => apiFetch("/api/sources").then(jsonOrApiError<Source[]>),
  updateSource: (id: string, patch: { searchUrl?: string | null; enabled?: boolean }) =>
    apiFetch(`/api/sources/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(jsonOrApiError<{ ok: true }>),
  listListings: (params: {
    sort?: "price" | "sqm" | "firstSeen" | "lastSeen";
    order?: "asc" | "desc";
    source?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.sort) q.set("sort", params.sort);
    if (params.order) q.set("order", params.order);
    if (params.source) q.set("source", params.source);
    return apiFetch(`/api/listings?${q}`).then(jsonOrApiError<Listing[]>);
  },
  refresh: () => apiFetch("/api/refresh", { method: "POST" }).then(jsonOrApiError<RefreshResult>),
  scrapeLink: (url: string) =>
    apiFetch("/api/saved/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).then(jsonOrApiError<ScrapeResult>),
  startFill: (url: string, missing: FillField[]) =>
    apiFetch("/api/saved/fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, missing }),
    }).then(jsonOrApiError<FillJob>),
  /** Waits up to 25 seconds on the server for the job to change. */
  pollFill: (id: string) => apiFetch(`/api/saved/fill/${encodeURIComponent(id)}?wait=25`).then(jsonOrApiError<FillJob>),
  cancelFill: (id: string) =>
    apiFetch(`/api/saved/fill/${encodeURIComponent(id)}`, { method: "DELETE" }).then(jsonOrApiError<FillJob>),
  listSaved: () => apiFetch("/api/saved").then(jsonOrApiError<SavedApartment[]>),
  createSaved: (input: SavedInput) =>
    apiFetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(jsonOrApiError<SavedApartment>),
  updateSaved: (id: number, input: SavedInput) =>
    apiFetch(`/api/saved/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then(jsonOrApiError<SavedApartment>),
  deleteSaved: async (id: number) => {
    const res = await apiFetch(`/api/saved/${id}`, { method: "DELETE" });
    if (!res.ok) await jsonOrApiError<never>(res);
  },
  getIssuesStatus: () => apiFetch("/api/issues").then(jsonOrApiError<{ count: number; max: number }>),
  submitIssue: (body: string) =>
    apiFetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).then(jsonOrApiError<{ id: string; count: number; max: number }>),
};
