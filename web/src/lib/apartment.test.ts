import { describe, expect, it } from 'vitest';
import { formFromFields, parseFloorInput, parseForm } from './apartment.ts';

const URL_ = 'https://www.storia.ro/ro/oferta/x';

describe('formFromFields', () => {
  it('turns a draft into strings, floor 0 as P', () => {
    const v = formFromFields(URL_, {
      title: 'Ap 2 camere',
      priceEur: 72000,
      rooms: 2,
      sqm: 42.5,
      floor: 0,
      floorsTotal: 4,
      yearBuilt: 1980,
      location: 'Calea Sagului',
      partitioning: 'decomandat',
      imageUrl: null,
    });
    expect(v).toMatchObject({ priceEur: '72000', sqm: '42.5', floor: 'P', imageUrl: '', notes: '' });
  });

  it('gives an empty form for a page that could not be read', () => {
    expect(formFromFields(URL_, null).title).toBe('');
  });
});

describe('parseForm', () => {
  const base = formFromFields(URL_, null);

  it('reads the ways people type numbers', () => {
    const r = parseForm({
      ...base,
      priceEur: '72.000 €',
      sqm: '42,5 mp',
      floor: 'parter',
      floorsTotal: '4',
      partitioning: 'semidecomandat',
      notes: '  near the tram  ',
    });
    expect(r.ok && r.input).toMatchObject({
      url: URL_,
      priceEur: 72000,
      sqm: 42.5,
      floor: 0,
      floorsTotal: 4,
      partitioning: 'semidecomandat',
      notes: 'near the tram',
      title: null,
    });
  });

  it('keeps an empty partitioning as null', () => {
    const r = parseForm(base);
    expect(r.ok && r.input.partitioning).toBeNull();
  });

  it('reports each bad field', () => {
    const r = parseForm({
      ...base,
      url: 'storia.ro/x',
      rooms: 'two',
      floor: '5',
      floorsTotal: '4',
      yearBuilt: '19 80',
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['floor', 'rooms', 'url', 'yearBuilt']);
  });
});

describe('parseFloorInput', () => {
  it.each([
    ['P', 0],
    ['d', -1],
    ['subsol', -1],
    ['7', 7],
    ['', null],
  ])('%s → %s', (input, expected) => {
    expect(parseFloorInput(input)).toBe(expected);
  });

  it('rejects anything else', () => {
    expect(() => parseFloorInput('mansarda')).toThrow();
  });
});
