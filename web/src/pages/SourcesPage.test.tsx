import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Source } from '../api.ts';
import { SourcesPage } from './SourcesPage.tsx';

const STORIA: Source = {
  id: 'storia',
  displayName: 'storia.ro',
  searchUrl: null,
  enabled: true,
  lastRunAt: null,
  lastRunOk: null,
};

const down = () => new Response('', { status: 502, headers: { 'Content-Type': 'text/plain' } });

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<SourcesPage> when the API is down', () => {
  it('shows the alert instead of an empty list, and Retry loads it', async () => {
    let up = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => (up ? new Response(JSON.stringify([STORIA]), { status: 200 }) : down())),
    );
    const user = userEvent.setup();
    render(<SourcesPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load the sources. Can't reach the API: is it running?",
    );
    expect(screen.queryByText('storia.ro')).not.toBeInTheDocument();

    up = true;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('storia.ro')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says a Save failed, keeps the edit, and Retry saves it', async () => {
    let up = true;
    const puts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string, init?: RequestInit) => {
        if (!up) return down();
        if (init?.method === 'PUT') {
          puts.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify([STORIA]), { status: 200 });
      }),
    );
    const user = userEvent.setup();
    render(<SourcesPage />);

    await user.type(await screen.findByRole('textbox'), 'https://www.storia.ro/ro/rezultate');
    up = false;
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Not saved. Can't reach the API: is it running?",
    );
    expect(screen.getByRole('textbox')).toHaveValue('https://www.storia.ro/ro/rezultate');
    expect(screen.getByText('1 unsaved')).toBeInTheDocument();

    up = true;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(puts).toEqual([{ searchUrl: 'https://www.storia.ro/ro/rezultate', enabled: true }]);
  });
});
