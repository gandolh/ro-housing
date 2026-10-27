import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  extractDetails,
  fold,
  parseFloor,
  parseFloorsTotal,
  parsePartitioning,
} from './extract.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8');

describe('extractDetails on real page shapes', () => {
  it('storia: reads the embedded __NEXT_DATA__ ad', () => {
    const r = extractDetails(
      fixture('storia.html'),
      'https://www.storia.ro/ro/oferta/apartament-2-camere-calea-agului-balcon-IDIUGS',
    );
    expect(r.fields).toEqual({
      title: 'Apartament 2 camere, Calea Șagului, balcon',
      priceEur: 72000,
      pricePlusVat: false,
      rooms: 2,
      sqm: 42,
      floor: 4,
      floorsTotal: 5,
      yearBuilt: 1980,
      location: 'Calea Sagului',
      partitioning: null,
      imageUrl:
        'https://ireland.apollo.olxcdn.com/v1/files/EXAMPLE-1/image;s=1280x1024;q=80',
    });
    expect(r.sources.priceEur).toBe('storia');
    expect(r.found).not.toContain('partitioning');
    expect(r.description).toContain('bloc din 1980');
  });

  it('foxfort: label/value list, ignoring nav, filters, footer and similar listings', () => {
    const r = extractDetails(
      fixture('foxfort.html'),
      'https://foxfort.ro/vanzare-apartamente/timisoara/central/3-camere/oferta-p7577',
    );
    expect(r.fields).toMatchObject({
      title: 'Apartament deosebit, 3 camere, zona Central – Bld. C.D. Loga',
      priceEur: 429990,
      rooms: 3,
      sqm: 135.8,
      floor: 1,
      floorsTotal: 2,
      yearBuilt: 1930,
      location: 'Central',
      partitioning: 'decomandat',
      imageUrl: 'https://foxfort.ro/oferte/7577/big__EXAMPLE.jpg',
    });
  });

  it('primum: "Pret:" in a <strong>, labels inside list items, ID cut from the title', () => {
    const r = extractDetails(
      fixture('primum.html'),
      'https://www.primum.ro/apartament-2-camere-de-vanzare-aradului-timisoara-16645.html',
    );
    expect(r.fields).toMatchObject({
      title: 'Aradului 2 Camere Etaj intermediar cu LIFT Decomandat Zona excelenta',
      priceEur: 108000,
      rooms: 2,
      sqm: 50,
      floor: 6,
      floorsTotal: 10,
      yearBuilt: 1980,
      location: 'Aradului',
      partitioning: 'decomandat',
    });
  });

  it('apostu: label and value in sibling elements; the details block beats the prose', () => {
    const r = extractDetails(
      fixture('apostu.html'),
      'https://www.apostuestate.ro/apartament-2-camere-de-vanzare-freidorf-timisoara-37912.html',
    );
    expect(r.fields).toMatchObject({
      priceEur: 102000,
      rooms: 2,
      sqm: 50,
      floor: 3,
      floorsTotal: 3,
      yearBuilt: 2025,
      location: 'Freidorf',
      // The prose says "decomandat", the structured block "semidecomandat".
      // Labels rank above prose; the user sees the value and can fix it.
      partitioning: 'semidecomandat',
    });
  });

  it('a bot-check page yields nothing but its title', () => {
    const r = extractDetails(fixture('blocked-datadome.html'), 'https://www.imobiliare.ro/x');
    expect(r.found).toEqual(['title']);
  });

  it('resolves a relative og:image against the page', () => {
    const html =
      '<html><head><meta property="og:title" content="Garsoniera Soarelui"><meta property="og:image" content="/img/1.jpg"></head><body></body></html>';
    const r = extractDetails(html, 'https://agentie.ro/oferta/1');
    expect(r.fields.imageUrl).toBe('https://agentie.ro/img/1.jpg');
    expect(r.fields.rooms).toBe(1);
  });

  it('marks a price given before VAT, from the layer that read the price', () => {
    const page = (price: string) =>
      `<html><body><ul><li>Nr. camere: 2</li><li>${price}</li></ul></body></html>`;
    const plus = extractDetails(page('Pret: 92.033 € + TVA'), 'https://agentie.ro/oferta/1');
    expect(plus.fields.priceEur).toBe(92033);
    expect(plus.fields.pricePlusVat).toBe(true);
    expect(plus.found).not.toContain('pricePlusVat');
    expect(extractDetails(page('Preț fără TVA: 92.033 €'), 'https://agentie.ro/oferta/1').fields)
      .toMatchObject({ priceEur: 92033, pricePlusVat: true });
    expect(extractDetails(page('Pret: 111.359 € TVA inclus'), 'https://agentie.ro/oferta/1').fields)
      .toMatchObject({ priceEur: 111359, pricePlusVat: false });
    expect(extractDetails(page('Etaj: 2'), 'https://agentie.ro/oferta/1').fields.pricePlusVat).toBeNull();
  });

  it('drops values outside sane ranges', () => {
    const html =
      '<html><body><p>Pret: 50 €</p><p>An constructie: 2999</p><p>Etaj: 9/4</p></body></html>';
    const r = extractDetails(html, 'https://agentie.ro/oferta/1');
    expect(r.fields.priceEur).toBeNull();
    expect(r.fields.yearBuilt).toBeNull();
    expect(r.fields.floor).toBe(9);
    expect(r.fields.floorsTotal).toBeNull();
  });
});

describe('label parsers', () => {
  it('fold keeps length and strips Romanian diacritics', () => {
    expect(fold('Suprafață utilă')).toBe('suprafata utila');
    expect(fold('Anul construcției')).toHaveLength('Anul construcției'.length);
    expect(fold('Şţ')).toBe('st');
  });

  it.each([
    ['Etaj 1', { floor: 1 }],
    ['3/4', { floor: 3, floorsTotal: 4 }],
    ['3 din 4', { floor: 3, floorsTotal: 4 }],
    ['3/3E', { floor: 3, floorsTotal: 3 }],
    ['Parter', { floor: 0 }],
    ['P/4', { floor: 0, floorsTotal: 4 }],
    ['Demisol', { floor: -1 }],
    ['Decomandat', {}],
    ['Mansarda', {}],
  ])('parseFloor(%s)', (input, expected) => {
    expect(parseFloor(input)).toMatchObject(expected);
    if (Object.keys(expected).length === 0) expect(parseFloor(input).floor).toBeUndefined();
  });

  it.each([
    ['D+P+2', 2],
    ['S+P+10E', 10],
    ['P+4+M', 4],
    ['5', 5],
    ['Parter', 0],
  ])('parseFloorsTotal(%s) = %i', (input, expected) => {
    expect(parseFloorsTotal(input)).toBe(expected);
  });

  it('parsePartitioning tells semi- from plain decomandat', () => {
    expect(parsePartitioning('Semidecomandat')).toBe('semidecomandat');
    expect(parsePartitioning('semi-decomandat')).toBe('semidecomandat');
    expect(parsePartitioning('este decomandat si')).toBe('decomandat');
    expect(parsePartitioning('* Living')).toBeUndefined();
  });
});
