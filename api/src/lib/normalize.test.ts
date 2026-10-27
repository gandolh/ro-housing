import { describe, expect, it } from 'vitest';
import {
  cleanText,
  extractPriceEur,
  locationFromImobiliareUrl,
  parsePriceEur,
  parseRooms,
  parseSqm,
  pickLargestPriceEur,
  slugFromUrl,
  stripTrailingPrice,
} from './normalize.ts';

describe('parsePriceEur', () => {
  it('parses common Romanian price formats', () => {
    expect(parsePriceEur('125.000 €')).toBe(125000);
    expect(parsePriceEur('1.250 €')).toBe(1250);
    expect(parsePriceEur('1 250 €')).toBe(1250);
    expect(parsePriceEur('109,000 EUR')).toBe(109000);
  });

  it('converts RON to EUR at the documented 1:5 rate', () => {
    expect(parsePriceEur('500.000 RON')).toBe(100000);
    expect(parsePriceEur('250.000 lei')).toBe(50000);
  });

  it('returns undefined for unparseable input', () => {
    expect(parsePriceEur('')).toBeUndefined();
    expect(parsePriceEur(null)).toBeUndefined();
    expect(parsePriceEur('contact for price')).toBeUndefined();
    expect(parsePriceEur('0 €')).toBeUndefined();
  });
});

describe('extractPriceEur', () => {
  // The adapters' old regex took the numbers in front of the price too; these
  // gave 289000, 12299000 and 75 before (run on 2026-10-21).
  it('reads the price, not the floor or street number in front of it', () => {
    expect(extractPriceEur('Etaj 2 89.000 €')).toBe(89000);
    expect(extractPriceEur('Strada Aradului 12 299 000 €')).toBe(299000);
    expect(extractPriceEur('Etaj 3 120\u00a0000 €')).toBe(120000);
    expect(extractPriceEur('3 camere65 m²Etaj 2\n89 500 EUR')).toBe(89500);
  });

  it('takes the amount followed by the currency sign in a range', () => {
    expect(extractPriceEur('75.000 - 80.000 €')).toBe(80000);
  });

  it('reads the formats the adapters met before', () => {
    expect(extractPriceEur('125.000 €')).toBe(125000);
    expect(extractPriceEur('Pret 125.000 €')).toBe(125000);
    expect(extractPriceEur('109,000 EUR')).toBe(109000);
    expect(extractPriceEur('72.000,00 €')).toBe(72000);
    expect(extractPriceEur('89000 euro')).toBe(89000);
    expect(extractPriceEur('1.299.000 €')).toBe(1299000);
  });

  it('skips the discount blurb in a developer card', () => {
    const text =
      'Dezvoltator -3% Discount aplicat: Ap si Boxă + 2000 € Discount la parcare | Oferta limitata! 111.359 € 92.033 € +TVA';
    expect(extractPriceEur(text)).toBe(111359);
  });

  it('skips a price per m²', () => {
    expect(extractPriceEur('1.850 €/m² 120.000 €')).toBe(120000);
  });

  it('skips the price marked "Preț vechi", wherever it stands', () => {
    expect(
      extractPriceEur('Apartament 2 camere zona X 109.000 € 131.890 € Preț vechi 131.890 €'),
    ).toBe(109000);
    expect(extractPriceEur('Pret vechi: 131.890 € 109.000 €')).toBe(109000);
  });

  it('returns undefined outside 5,000-5,000,000 € or without a price', () => {
    expect(extractPriceEur('1 250 €')).toBeUndefined();
    expect(extractPriceEur('6.000.000 €')).toBeUndefined();
    expect(extractPriceEur('12299000 €')).toBeUndefined();
    expect(extractPriceEur('0 €')).toBeUndefined();
    expect(extractPriceEur('contact for price')).toBeUndefined();
    expect(extractPriceEur('Apartament 2 camere zona Aradului')).toBeUndefined();
    expect(extractPriceEur('')).toBeUndefined();
    expect(extractPriceEur(null)).toBeUndefined();
  });
});

describe('parseRooms', () => {
  it('extracts the number from "N camere"-style strings', () => {
    expect(parseRooms('2 camere')).toBe(2);
    expect(parseRooms('3 cam')).toBe(3);
    expect(parseRooms('1 camera')).toBe(1);
    expect(parseRooms('4 rooms')).toBe(4);
  });

  it('parses a bare digit', () => {
    expect(parseRooms('  3  ')).toBe(3);
  });

  it('returns undefined for input without a room count', () => {
    expect(parseRooms('')).toBeUndefined();
    expect(parseRooms(null)).toBeUndefined();
    expect(parseRooms('apartament')).toBeUndefined();
  });

  it('ignores stray percentages without "camere"', () => {
    // Verified parser-side: percentages like "3%" don't match the regex because the
    // pattern requires `camere/camera/cam/room` after the digits.
    expect(parseRooms('Discount aplicat 3% pe TVA')).toBeUndefined();
  });

  it('does not match the wrong half of a fraction like "1,5 camere"', () => {
    expect(parseRooms('Dezvoltator Apartament cu 1,5 camere FUNCTIONAL')).not.toBe(5);
  });
});

describe('parseSqm', () => {
  it('parses common m² formats', () => {
    expect(parseSqm('54 m²')).toBe(54);
    expect(parseSqm('54.2 m²')).toBe(54.2);
    expect(parseSqm('54,2 m2')).toBe(54.2);
    expect(parseSqm('73 mp utili')).toBe(73);
    expect(parseSqm('40 sqm')).toBe(40);
  });

  it('returns undefined for inputs without an area', () => {
    expect(parseSqm('')).toBeUndefined();
    expect(parseSqm(null)).toBeUndefined();
    expect(parseSqm('mare si luminos')).toBeUndefined();
  });
});

describe('cleanText', () => {
  it('collapses whitespace and trims', () => {
    expect(cleanText('  hello   world  ')).toBe('hello world');
    expect(cleanText('line1\n\n  line2')).toBe('line1 line2');
  });

  it('returns undefined for empty / null input', () => {
    expect(cleanText('')).toBeUndefined();
    expect(cleanText('   ')).toBeUndefined();
    expect(cleanText(null)).toBeUndefined();
  });
});

describe('pickLargestPriceEur', () => {
  it('picks the actual listing price over a discount fragment', () => {
    const text =
      'Dezvoltator -3% Discount aplicat: Ap si Boxă + 2000 € Discount la parcare | Oferta limitata! 111.359 € 92.033 € +TVA';
    expect(pickLargestPriceEur(text)).toBe(111359);
  });

  it('returns undefined when no euro tokens are present', () => {
    expect(pickLargestPriceEur('Apartament 2 camere zona Aradului')).toBeUndefined();
    expect(pickLargestPriceEur(null)).toBeUndefined();
  });

  it('handles a single price correctly', () => {
    expect(pickLargestPriceEur('Pret 125.000 €')).toBe(125000);
  });
});

describe('stripTrailingPrice', () => {
  it('removes a trailing price suffix', () => {
    expect(stripTrailingPrice('Nu e doar un apartament. 125.000 €')).toBe(
      'Nu e doar un apartament.',
    );
    expect(
      stripTrailingPrice(
        'Apartament 2 camere zona X 109.000 € 131.890 € Preț vechi',
      ),
    ).toBe('Apartament 2 camere zona X');
  });

  it('returns the cleaned title unchanged when no price suffix is present', () => {
    expect(stripTrailingPrice('  Apartament  2  camere  zona X  ')).toBe(
      'Apartament 2 camere zona X',
    );
  });

  it('returns undefined for empty input', () => {
    expect(stripTrailingPrice('')).toBeUndefined();
    expect(stripTrailingPrice(null)).toBeUndefined();
  });
});

describe('locationFromImobiliareUrl', () => {
  it('extracts the neighborhood from a standard apartment URL', () => {
    expect(
      locationFromImobiliareUrl(
        'https://www.imobiliare.ro/oferta/apartament-de-vanzare-timisoara-lipovei-2-camere-275346765',
      ),
    ).toBe('lipovei');

    expect(
      locationFromImobiliareUrl(
        'https://www.imobiliare.ro/oferta/apartament-de-vanzare-timisoara-complex-studentesc-3-camere-275550351',
      ),
    ).toBe('complex studentesc');
  });

  it('handles the "mobilat" prefix in the slug', () => {
    expect(
      locationFromImobiliareUrl(
        'https://www.imobiliare.ro/oferta/apartament-de-vanzare-timisoara-aradului-mobilat-3-camere-271420872',
      ),
    ).toBe('aradului');
  });

  it('handles garsoniera URLs', () => {
    expect(
      locationFromImobiliareUrl(
        'https://www.imobiliare.ro/oferta/garsoniera-de-vanzare-timisoara-torontalului-424-mp-199190533',
      ),
    ).toBe('torontalului');
  });

  it('returns undefined for unrecognized url shapes', () => {
    expect(locationFromImobiliareUrl('https://example.com/foo')).toBeUndefined();
    expect(locationFromImobiliareUrl('not-a-url')).toBeUndefined();
  });
});

describe('slugFromUrl', () => {
  it('returns the last non-empty path segment', () => {
    expect(slugFromUrl('https://example.com/foo/bar')).toBe('bar');
    expect(slugFromUrl('https://example.com/foo/bar/')).toBe('bar');
    expect(slugFromUrl('https://imobiliare.ro/oferta/apartament-de-vanzare-timisoara-lipovei-2-camere-275346765'))
      .toBe('apartament-de-vanzare-timisoara-lipovei-2-camere-275346765');
  });

  it('falls back to the input on malformed urls', () => {
    expect(slugFromUrl('not-a-url')).toBe('not-a-url');
  });
});
