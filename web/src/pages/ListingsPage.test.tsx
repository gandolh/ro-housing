import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Listing, Source } from '../api.ts';
import { ListingsPage } from './ListingsPage.tsx';

const DAY = 86_400_000;
// storia's last run succeeded at RUN; imobiliare's last run failed.
const RUN = Date.UTC(2026, 9, 27, 12, 0);

function source(over: Partial<Source>): Source {
  return {
    id: 'storia',
    displayName: 'storia.ro',
    searchUrl: 'https://www.storia.ro/ro/rezultate/vanzare/apartament/timis/timisoara',
    enabled: true,
    lastRunAt: RUN,
    lastRunOk: true,
    ...over,
  };
}

function listing(id: number, title: string, sourceId: string, lastSeen: number): Listing {
  return {
    id,
    sourceId,
    sourceUid: `uid-${id}`,
    url: `https://example.test/${id}`,
    title,
    priceEur: 90000,
    pricePlusVat: false,
    rooms: 2,
    sqm: 50,
    location: null,
    firstSeen: lastSeen - 10 * DAY,
    lastSeen,
    history: [],
  };
}

const SOURCES = [
  source({}),
  source({ id: 'imobiliare', displayName: 'imobiliare.ro', lastRunOk: false }),
];
const LISTINGS = [
  // Seen by storia's last run (stamped a moment before the run itself).
  listing(1, 'Seen in the last run', 'storia', RUN - 200),
  listing(2, 'Gone since three days', 'storia', RUN - 3 * DAY),
  // imobiliare's last run failed: its newest row marks its last good run.
  listing(3, 'Seen in the last good run', 'imobiliare', RUN - 2 * DAY),
  listing(4, 'Gone before the last good run', 'imobiliare', RUN - 5 * DAY),
];

function mockApi(routes: Record<string, () => [number, unknown]>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${input.split('?')[0]}`;
      calls.push(key);
      const handler = routes[key];
      if (!handler) throw new Error(`unexpected ${key}`);
      const [status, payload] = handler();
      return new Response(JSON.stringify(payload), { status });
    }),
  );
  return calls;
}

const row = (name: RegExp) => screen.getByRole('row', { name });

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<ListingsPage> staleness', () => {
  it('dims, on a fresh page load, the rows older than their source’s last run', async () => {
    mockApi({
      'GET /api/listings': () => [200, LISTINGS],
      'GET /api/sources': () => [200, SOURCES],
    });
    render(<ListingsPage onSaveLink={() => {}} />);

    expect(await screen.findByText('Seen in the last run')).toBeInTheDocument();
    expect(row(/Seen in the last run/)).not.toHaveAttribute('data-stale');
    expect(row(/Gone since three days/)).toHaveAttribute('data-stale');
    expect(row(/Seen in the last good run/)).not.toHaveAttribute('data-stale');
    expect(row(/Gone before the last good run/)).toHaveAttribute('data-stale');
  });

  it('puts the last-seen date in the Age cell’s title', async () => {
    mockApi({
      'GET /api/listings': () => [200, LISTINGS],
      'GET /api/sources': () => [200, SOURCES],
    });
    render(<ListingsPage onSaveLink={() => {}} />);

    const age = await screen.findAllByTitle(/^Last seen \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    expect(age).toHaveLength(4);
    expect(screen.getAllByTitle(/not found by its source’s last refresh/)).toHaveLength(2);
  });

  it('says so when Refresh fails, and dims nothing new', async () => {
    const calls = mockApi({
      'GET /api/listings': () => [200, LISTINGS],
      'GET /api/sources': () => [200, SOURCES],
      'POST /api/refresh': () => [500, { error: 'database is locked' }],
    });
    const user = userEvent.setup();
    render(<ListingsPage onSaveLink={() => {}} />);
    await screen.findByText('Seen in the last run');

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh failed. Database is locked');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
    expect(row(/Seen in the last run/)).not.toHaveAttribute('data-stale');
    expect(row(/Seen in the last good run/)).not.toHaveAttribute('data-stale');
    expect(calls.filter((c) => c === 'GET /api/listings')).toHaveLength(1);
  });

  it('says when another Refresh is already running (409)', async () => {
    mockApi({
      'GET /api/listings': () => [200, LISTINGS],
      'GET /api/sources': () => [200, SOURCES],
      'POST /api/refresh': () => [409, { error: 'a refresh is already running' }],
    });
    const user = userEvent.setup();
    render(<ListingsPage onSaveLink={() => {}} />);
    await screen.findByText('Seen in the last run');

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Another Refresh is already running. Try again when it has finished.',
    );
  });
});

describe('<ListingsPage> prices before VAT', () => {
  it('shows +TVA beside the price and the €/m² of a listing priced before VAT', async () => {
    const net = { ...listing(5, 'New build, priced + TVA', 'storia', RUN - 200), pricePlusVat: true };
    mockApi({
      'GET /api/listings': () => [200, [net, LISTINGS[0]]],
      'GET /api/sources': () => [200, SOURCES],
    });
    render(<ListingsPage onSaveLink={() => {}} />);

    const marked = await screen.findByRole('row', { name: /New build, priced \+ TVA/ });
    expect(within(marked).getAllByText('+TVA')).toHaveLength(2);
    expect(within(marked).getByText('90.000 €')).toBeInTheDocument();
    expect(within(row(/Seen in the last run/)).queryByText('+TVA')).not.toBeInTheDocument();
  });
});

describe('<ListingsPage> when the API is down', () => {
  it('shows the alert, not "No listings yet", and Retry loads the table', async () => {
    let up = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        // Vite's proxy answers 502 with a plain-text body when the API is not running.
        if (!up) return new Response('', { status: 502, headers: { 'Content-Type': 'text/plain' } });
        const body = input.startsWith('/api/sources') ? SOURCES : LISTINGS;
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    const user = userEvent.setup();
    render(<ListingsPage onSaveLink={() => {}} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load the listings. Can't reach the API: is it running?",
    );
    expect(screen.queryByText(/No listings yet/)).not.toBeInTheDocument();
    expect(screen.queryByText('0 listings')).not.toBeInTheDocument();

    up = true;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Seen in the last run')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
