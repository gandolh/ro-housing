import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapeResult, Source } from './api.ts';
import { App } from './App.tsx';

const LINK = 'https://www.storia.ro/ro/oferta/apartament-2-camere-IDIUGS';

const DRAFT: ScrapeResult = {
  url: LINK,
  site: 'storia.ro',
  existing: null,
  draft: {
    title: 'Apartament 2 camere',
    priceEur: 72000,
    rooms: 2,
    sqm: 42,
    floor: 4,
    floorsTotal: 5,
    yearBuilt: 1980,
    location: null,
    partitioning: null,
    imageUrl: null,
  },
  found: ['title', 'priceEur', 'rooms', 'sqm', 'floor', 'floorsTotal', 'yearBuilt'],
  via: 'fetch',
  problem: null,
};

function storia(over: Partial<Source> = {}): Source {
  return {
    id: 'storia',
    displayName: 'storia.ro',
    searchUrl: null,
    enabled: true,
    lastRunAt: null,
    lastRunOk: null,
    ...over,
  };
}

/** Routes fetch calls by method and path (query ignored); counts each. */
function mockApi(routes: Record<string, () => unknown>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${input.split('?')[0]}`;
      calls.push(key);
      const handler = routes[key];
      if (!handler) throw new Error(`unexpected ${key}`);
      return new Response(JSON.stringify(handler()), { status: 200 });
    }),
  );
  return calls;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<App> tabs', () => {
  it('keeps an open draft and its notes when going to Listings and back', async () => {
    const calls = mockApi({
      'GET /api/listings': () => [],
      'GET /api/sources': () => [storia()],
      'GET /api/saved': () => [],
      'GET /api/issues': () => ({ count: 0, max: 10 }),
      'POST /api/saved/scrape': () => DRAFT,
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Saved' }));
    await user.type(screen.getByRole('textbox', { name: 'Listing link' }), LINK);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    const notes = await screen.findByRole('textbox', { name: 'Notes' });
    await user.type(notes, 'call the agent on Monday');

    await user.click(screen.getByRole('tab', { name: 'Listings' }));
    expect(screen.queryByRole('textbox', { name: 'Notes' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Saved' }));

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('call the agent on Monday');
    expect(screen.getByRole('textbox', { name: 'Listing link' })).toHaveValue(LINK);
    expect(calls.filter((c) => c === 'POST /api/saved/scrape')).toHaveLength(1);
    expect(calls.filter((c) => c === 'GET /api/saved')).toHaveLength(1);
  });

  it('keeps unsaved Sources edits, and re-reads the last runs when Sources opens again', async () => {
    let sources = [storia()];
    mockApi({
      'GET /api/listings': () => [],
      'GET /api/sources': () => sources,
      'GET /api/saved': () => [],
      'GET /api/issues': () => ({ count: 0, max: 10 }),
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Sources' }));
    const url = await screen.findByRole('textbox');
    await user.type(url, 'https://www.storia.ro/ro/rezultate');
    expect(screen.getByText('1 unsaved')).toBeInTheDocument();

    // A Refresh elsewhere ran storia and it failed.
    sources = [storia({ lastRunAt: Date.now(), lastRunOk: false })];
    await user.click(screen.getByRole('tab', { name: 'Listings' }));
    await user.click(screen.getByRole('tab', { name: 'Sources' }));

    expect(await screen.findByText('— failed')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('https://www.storia.ro/ro/rezultate');
    expect(screen.getByText('1 unsaved')).toBeInTheDocument();
  });
});
