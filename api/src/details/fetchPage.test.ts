import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { looksBlocked } from './fetchPage.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8');

describe('looksBlocked', () => {
  it('spots the Cloudflare block page imobiliare.ro serves to plain fetch', () => {
    expect(looksBlocked(fixture('blocked-cloudflare.html'))).toBe(true);
  });

  it('spots the DataDome CAPTCHA imobiliare.ro serves to headless Chromium', () => {
    expect(looksBlocked(fixture('blocked-datadome.html'))).toBe(true);
  });

  it.each(['storia.html', 'foxfort.html', 'primum.html', 'apostu.html'])(
    'passes a real listing page (%s)',
    (name) => {
      expect(looksBlocked(fixture(name))).toBe(false);
    },
  );

  it('passes a page without og:title when it has real content', () => {
    const body = '<p>Apartament 2 camere, Pret: 90.000 €.</p>'.repeat(20);
    expect(looksBlocked(`<html><head><title>Oferta</title></head><body>${body}</body></html>`)).toBe(false);
  });
});
