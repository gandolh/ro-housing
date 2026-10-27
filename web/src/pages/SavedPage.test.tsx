import { StrictMode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedApartment, ScrapeResult } from '../api.ts';
import { SavedPage } from './SavedPage.tsx';

const LINK = 'https://www.storia.ro/ro/oferta/apartament-2-camere-IDIUGS';

const DRAFT: ScrapeResult = {
  url: LINK,
  site: 'storia.ro',
  existing: null,
  draft: {
    title: 'Apartament 2 camere, Calea Șagului',
    priceEur: 72000,
    rooms: 2,
    sqm: 42,
    floor: 4,
    floorsTotal: 5,
    yearBuilt: 1980,
    location: 'Calea Sagului',
    partitioning: null,
    imageUrl: null,
    pricePlusVat: false,
  },
  found: ['title', 'priceEur', 'rooms', 'sqm', 'floor', 'floorsTotal', 'yearBuilt', 'location'],
  via: 'fetch',
  problem: null,
};

function savedRow(over: Partial<SavedApartment> = {}): SavedApartment {
  return {
    ...DRAFT.draft!,
    id: 1,
    url: LINK,
    site: 'storia.ro',
    notes: null,
    fetchedAt: 1,
    savedAt: Date.UTC(2026, 9, 16),
    updatedAt: 1,
    ...over,
  };
}

interface Call {
  url: string;
  method: string;
  body: unknown;
}

/** Routes fetch calls to canned responses and records what was sent. */
function mockApi(routes: Record<string, (body: unknown) => [number, unknown]>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url: input, method, body });
      const handler = routes[`${method} ${input}`];
      if (!handler) throw new Error(`unexpected ${method} ${input}`);
      const [status, payload] = handler(body);
      return new Response(payload === undefined ? null : JSON.stringify(payload), { status });
    }),
  );
  return calls;
}

const noop = () => {};

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<SavedPage> add by link', () => {
  it('fetches a draft, lets the user edit it, and saves what they confirmed', async () => {
    let saved: SavedApartment[] = [];
    const calls = mockApi({
      'GET /api/saved': () => [200, saved],
      'POST /api/saved/scrape': () => [200, DRAFT],
      'POST /api/saved': (body) => {
        saved = [savedRow(body as Partial<SavedApartment>)];
        return [201, saved[0]];
      },
    });
    const user = userEvent.setup();
    render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);

    await user.type(screen.getByRole('textbox', { name: 'Listing link' }), LINK);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    expect(await screen.findByText(/Read 8 of 10 fields from storia\.ro/)).toBeInTheDocument();
    const price = screen.getByRole('textbox', { name: /Price €/ });
    expect(price).toHaveValue('72000');
    expect(screen.getByText('Price €').textContent).toContain('from page');
    expect(screen.getByText('Partitioning').textContent).toContain('not on page');

    await user.clear(price);
    await user.type(price, '70.000');
    expect(screen.getByText('Price €').textContent).toContain('edited');
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'offer 70k');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/Saved: Apartament 2 camere/)).toBeInTheDocument();
    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/saved');
    expect(post?.body).toMatchObject({
      url: LINK,
      priceEur: 70000,
      rooms: 2,
      floor: 4,
      partitioning: null,
      notes: 'offer 70k',
    });
    const table = screen.getByRole('table');
    expect(within(table).getByText('70.000 €')).toBeInTheDocument();
    expect(within(table).getByText('4/5')).toBeInTheDocument();
  });

  it('shows the bot-check message and still lets the user save by hand', async () => {
    mockApi({
      'GET /api/saved': () => [200, []],
      'POST /api/saved/scrape': () => [
        200,
        {
          ...DRAFT,
          url: 'https://www.imobiliare.ro/oferta/x',
          site: 'imobiliare.ro',
          draft: { ...DRAFT.draft!, title: null, priceEur: null, rooms: null, sqm: null, floor: null, floorsTotal: null, yearBuilt: null, location: null },
          found: [],
          via: null,
          problem: { kind: 'blocked', message: 'The site answered with a bot check instead of the listing.' },
        },
      ],
    });
    const user = userEvent.setup();
    render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);

    await user.type(screen.getByRole('textbox', { name: 'Listing link' }), 'https://www.imobiliare.ro/oferta/x');
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/bot check/);
    expect(alert).toHaveTextContent(/Nothing was read from imobiliare\.ro/);
    expect(screen.getByRole('textbox', { name: /Price €/ })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('says a link is already saved instead of fetching it again', async () => {
    mockApi({
      'GET /api/saved': () => [200, [savedRow()]],
      'POST /api/saved/scrape': () => [200, { ...DRAFT, existing: savedRow(), draft: null, found: [], via: null }],
    });
    const user = userEvent.setup();
    render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);

    await user.type(screen.getByRole('textbox', { name: 'Listing link' }), LINK);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    expect(await screen.findByText(/Already saved on/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit it' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('fetches a link handed over from the Listings tab', async () => {
    const calls = mockApi({
      'GET /api/saved': () => [200, []],
      'POST /api/saved/scrape': () => [200, DRAFT],
    });
    const taken = vi.fn();
    // StrictMode, as in main.tsx: the hand-over must still fetch only once.
    render(
      <StrictMode>
        <SavedPage incomingLink={LINK} onIncomingTaken={taken} />
      </StrictMode>,
    );

    expect(await screen.findByText(/Read 8 of 10 fields/)).toBeInTheDocument();
    expect(taken).toHaveBeenCalled();
    const scrapes = calls.filter((c) => c.url === '/api/saved/scrape');
    expect(scrapes).toHaveLength(1);
    expect(scrapes[0]?.body).toEqual({ url: LINK });
  });

  it('deletes only after a second click', async () => {
    let saved = [savedRow()];
    const calls = mockApi({
      'GET /api/saved': () => [200, saved],
      'DELETE /api/saved/1': () => {
        saved = [];
        return [204, undefined];
      },
    });
    const user = userEvent.setup();
    render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);

    await user.click(await screen.findByRole('button', { name: /^Delete Apartament/ }));
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Delete it' }));

    await waitFor(() => expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument());
  });
});

describe('<SavedPage> a price before VAT', () => {
  it('ticks +TVA from the page, saves it, and marks the saved row', async () => {
    let saved: SavedApartment[] = [];
    const calls = mockApi({
      'GET /api/saved': () => [200, saved],
      'POST /api/saved/scrape': () => [
        200,
        { ...DRAFT, draft: { ...DRAFT.draft!, priceEur: 92033, pricePlusVat: true } },
      ],
      'POST /api/saved': (body) => {
        saved = [savedRow(body as Partial<SavedApartment>)];
        return [201, saved[0]];
      },
    });
    const user = userEvent.setup();
    render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);

    await user.type(screen.getByRole('textbox', { name: 'Listing link' }), LINK);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    const box = await screen.findByRole('checkbox', { name: /\+ TVA \(before VAT\) · from page$/ });
    expect(box).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText(/Saved: Apartament 2 camere/);
    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/saved');
    expect(post?.body).toMatchObject({ priceEur: 92033, pricePlusVat: true });
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('+TVA')).toHaveLength(2);
  });
});

describe('<SavedPage> fetching again with a draft open', () => {
  const OTHER = 'https://www.storia.ro/ro/oferta/apartament-3-camere-XYZ';

  it('asks before replacing a draft with edits, and keeps the notes until told', async () => {
    const calls = mockApi({
      'GET /api/saved': () => [200, []],
      'POST /api/saved/scrape': () => [200, DRAFT],
    });
    const user = userEvent.setup();
    render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);
    const linkBox = screen.getByRole('textbox', { name: 'Listing link' });
    const scrapes = () => calls.filter((c) => c.url === '/api/saved/scrape').length;

    await user.type(linkBox, LINK);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    const notes = await screen.findByRole('textbox', { name: 'Notes' });
    await user.type(notes, 'ask about the parking');
    await user.clear(screen.getByRole('textbox', { name: /Price €/ }));
    await user.type(screen.getByRole('textbox', { name: /Price €/ }), '70000');

    // A second click on the button: nothing is fetched yet.
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fetching again replaces the open draft. Your edits to it are lost: price, notes.',
    );
    expect(scrapes()).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(notes).toHaveValue('ask about the parking');

    // Enter in the link box asks too; this time the user agrees.
    await user.type(linkBox, '{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Replace draft' }));
    await waitFor(() => expect(scrapes()).toBe(2));
    expect(await screen.findByRole('textbox', { name: 'Notes' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /Price €/ })).toHaveValue('72000');
  });

  it('fetches again at once when the draft has no edits', async () => {
    const calls = mockApi({
      'GET /api/saved': () => [200, []],
      'POST /api/saved/scrape': () => [200, DRAFT],
    });
    const user = userEvent.setup();
    render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);

    await user.type(screen.getByRole('textbox', { name: 'Listing link' }), LINK);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    await screen.findByRole('textbox', { name: 'Notes' });
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    await waitFor(() => expect(calls.filter((c) => c.url === '/api/saved/scrape')).toHaveLength(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks before a "save" from Listings replaces a draft with edits', async () => {
    const calls = mockApi({
      'GET /api/saved': () => [200, []],
      'POST /api/saved/scrape': () => [200, DRAFT],
    });
    const user = userEvent.setup();
    const { rerender } = render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);

    await user.type(screen.getByRole('textbox', { name: 'Listing link' }), LINK);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    await user.type(await screen.findByRole('textbox', { name: 'Notes' }), 'second visit');

    rerender(<SavedPage incomingLink={OTHER} onIncomingTaken={noop} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Your edits to it are lost: notes.');
    expect(calls.filter((c) => c.url === '/api/saved/scrape')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('second visit');
    expect(screen.getByRole('textbox', { name: 'Listing link' })).toHaveValue(OTHER);
  });
});

describe('<SavedPage> when the API is down', () => {
  it('shows the alert, not the empty shortlist, and Retry loads it', async () => {
    let up = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        // fetch rejects like this when nothing answers on the port.
        if (!up) throw new TypeError('Failed to fetch');
        return new Response(JSON.stringify([]), { status: 200 });
      }),
    );
    const user = userEvent.setup();
    render(<SavedPage incomingLink={null} onIncomingTaken={noop} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load the saved apartments. Can't reach the API: is it running?",
    );
    expect(screen.queryByText(/Nothing saved yet/)).not.toBeInTheDocument();
    expect(screen.queryByText('0 saved')).not.toBeInTheDocument();

    up = true;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
