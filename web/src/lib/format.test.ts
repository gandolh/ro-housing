import { describe, expect, it } from 'vitest';
import { fmtFloor, fmtPricePerSqm, pricePerSqm } from './format.ts';

describe('fmtFloor', () => {
  it.each([
    [3, 4, '3/4'],
    [0, 4, 'P/4'],
    [-1, 4, 'D/4'],
    [3, null, '3'],
    [null, 4, '—/4'],
    [null, null, '—'],
  ])('fmtFloor(%s, %s) = %s', (floor, total, expected) => {
    expect(fmtFloor(floor, total)).toBe(expected);
  });
});

describe('price per m²', () => {
  it('rounds to whole euro', () => {
    expect(pricePerSqm(72000, 42)).toBe(1714);
  });

  it('is empty without both values', () => {
    expect(pricePerSqm(null, 42)).toBeNull();
    expect(pricePerSqm(72000, 0)).toBeNull();
    expect(fmtPricePerSqm(72000, null)).toBe('—');
  });
});
