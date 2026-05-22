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

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public payload: { error?: string } | null,
  ) {
    super(payload?.error ?? `HTTP ${status}`);
  }
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
  listSources: () => fetch('/api/sources').then(json<Source[]>),
  updateSource: (
    id: string,
    patch: { searchUrl?: string | null; enabled?: boolean },
  ) =>
    fetch(`/api/sources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(json<{ ok: true }>),
  listListings: (params: {
    sort?: 'price' | 'sqm' | 'firstSeen' | 'lastSeen';
    order?: 'asc' | 'desc';
    source?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.sort) q.set('sort', params.sort);
    if (params.order) q.set('order', params.order);
    if (params.source) q.set('source', params.source);
    return fetch(`/api/listings?${q}`).then(json<Listing[]>);
  },
  refresh: () =>
    fetch('/api/refresh', { method: 'POST' }).then(json<RefreshResult>),
  getIssuesStatus: () =>
    fetch('/api/issues').then(json<{ count: number; max: number }>),
  submitIssue: (body: string) =>
    fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    }).then(jsonOrApiError<{ id: string; count: number; max: number }>),
};
