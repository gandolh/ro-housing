import { describe, expect, it } from 'vitest';
import { parseSavedInput } from './saved-input.ts';

describe('parseSavedInput', () => {
  it('accepts a URL alone, everything else null', () => {
    const r = parseSavedInput({ url: 'https://www.imobiliare.ro/oferta/x?utm_source=a' });
    expect(r).toEqual({
      ok: true,
      value: {
        url: 'https://www.imobiliare.ro/oferta/x',
        title: null,
        priceEur: null,
        rooms: null,
        sqm: null,
        floor: null,
        floorsTotal: null,
        yearBuilt: null,
        location: null,
        partitioning: null,
        imageUrl: null,
        notes: null,
      },
    });
  });

  it('trims text and treats blanks as empty', () => {
    const r = parseSavedInput({ url: 'https://a.ro/1', title: '  Ap 2 camere ', location: '   ' });
    expect(r.ok && r.value.title).toBe('Ap 2 camere');
    expect(r.ok && r.value.location).toBeNull();
  });

  it('keeps a full set of values', () => {
    const r = parseSavedInput({
      url: 'https://a.ro/1',
      priceEur: 72000,
      rooms: 2,
      sqm: 42.5,
      floor: 0,
      floorsTotal: 4,
      yearBuilt: 1980,
      partitioning: 'semidecomandat',
      imageUrl: 'https://cdn.a.ro/i.jpg;s=1200x0',
      notes: 'next to the tram',
    });
    expect(r.ok).toBe(true);
    expect(r.ok && r.value).toMatchObject({ floor: 0, sqm: 42.5, partitioning: 'semidecomandat' });
  });

  it.each([
    [{}, /url/],
    [{ url: 'not a link' }, /url/],
    [{ url: 'https://a.ro/1', priceEur: '72000' }, /priceEur must be a number/],
    [{ url: 'https://a.ro/1', rooms: 2.5 }, /whole number/],
    [{ url: 'https://a.ro/1', yearBuilt: 1500 }, /yearBuilt must be between/],
    [{ url: 'https://a.ro/1', floor: 5, floorsTotal: 4 }, /above the number of floors/],
    [{ url: 'https://a.ro/1', partitioning: 'open space' }, /partitioning must be one of/],
    [{ url: 'https://a.ro/1', imageUrl: 'javascript:x' }, /imageUrl/],
    [{ url: 'https://a.ro/1', notes: 'x'.repeat(5001) }, /notes is too long/],
  ])('rejects %j', (body, error) => {
    const r = parseSavedInput(body);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(error);
  });

  it('rejects a non-object body', () => {
    expect(parseSavedInput(null).ok).toBe(false);
    expect(parseSavedInput([1]).ok).toBe(false);
  });
});
