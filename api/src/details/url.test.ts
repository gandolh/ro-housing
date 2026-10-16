import { describe, expect, it } from 'vitest';
import { assertPublicHost, isPrivateAddress, normalizeListingUrl, siteOf } from './url.ts';

describe('normalizeListingUrl', () => {
  it('drops tracking params, the hash and a trailing slash', () => {
    expect(
      normalizeListingUrl(
        ' https://www.storia.ro/ro/oferta/apartament-IDIUGS/?utm_source=dark&utm_medium=social#gallery ',
      ),
    ).toBe('https://www.storia.ro/ro/oferta/apartament-IDIUGS');
  });

  it('keeps params that identify the listing', () => {
    expect(normalizeListingUrl('https://agentie.ro/oferta.php?id=42&fbclid=x')).toBe(
      'https://agentie.ro/oferta.php?id=42',
    );
  });

  it('rejects anything that is not http(s)', () => {
    expect(normalizeListingUrl('storia.ro/oferta/1')).toBeUndefined();
    expect(normalizeListingUrl('file:///etc/passwd')).toBeUndefined();
    expect(normalizeListingUrl('javascript:alert(1)')).toBeUndefined();
  });
});

describe('siteOf', () => {
  it('drops www.', () => {
    expect(siteOf('https://www.storia.ro/ro/oferta/x')).toBe('storia.ro');
    expect(siteOf('https://foxfort.ro/x')).toBe('foxfort.ro');
  });
});

describe('local-address guard', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.10', '169.254.169.254', '::1', 'fd00::1', '::ffff:192.168.0.1'])(
    '%s is private',
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );

  it.each(['89.36.0.1', '172.32.0.1', '2a02:2f0c::1'])('%s is public', (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );

  it('refuses localhost and private IP literals without a DNS lookup', async () => {
    await expect(assertPublicHost('http://localhost:3000/api')).rejects.toThrow(/local/);
    await expect(assertPublicHost('http://192.168.1.1/')).rejects.toThrow(/local/);
    await expect(assertPublicHost('http://[::1]/')).rejects.toThrow(/local/);
    await expect(assertPublicHost('http://89.36.0.1/')).resolves.toBeUndefined();
  });
});
