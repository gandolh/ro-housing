import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.ts';

const WARD = {
  WARD_OIDC_ISSUER: 'https://example.com/ward-api/oidc',
  WARD_OIDC_CLIENT_ID: 'ro-housing',
  WARD_OIDC_CLIENT_KEY: 'not-a-real-key',
  WARD_OIDC_REDIRECT_URI: 'https://example.com/ro-housing-api/auth/ward/callback',
};

describe('loadConfig', () => {
  it('defaults to local development: 127.0.0.1:3000, the Vite origin, no Ward', () => {
    expect(loadConfig({})).toEqual({
      host: '127.0.0.1',
      port: 3000,
      publicOrigin: 'http://127.0.0.1:5173',
      ward: undefined,
      trustedProxies: [],
      wicket: undefined,
    });
  });

  it('turns Fill the gaps on only with both Wicket settings', () => {
    const both = { WICKET_URL: 'https://example.com/wicket-api', WICKET_TOKEN: 'not-a-real-token' };
    expect(loadConfig(both).wicket).toEqual({ url: both.WICKET_URL, token: both.WICKET_TOKEN });
    expect(loadConfig({ WICKET_URL: both.WICKET_URL }).wicket).toBeUndefined();
    expect(loadConfig({ WICKET_TOKEN: both.WICKET_TOKEN, WICKET_URL: ' ' }).wicket).toBeUndefined();
    expect(() => loadConfig({ ...both, WICKET_URL: 'wicket-api' })).toThrow(/WICKET_URL/);
  });

  it('reads the container’s settings', () => {
    const config = loadConfig({
      HOST: '0.0.0.0',
      PORT: '8809',
      PUBLIC_ORIGIN: 'https://example.com',
      AUTH_TRUSTED_PROXIES: ' 172.16.0.0/12, ,10.0.2.0/24',
      ...WARD,
    });
    expect(config).toMatchObject({
      host: '0.0.0.0',
      port: 8809,
      publicOrigin: 'https://example.com',
      trustedProxies: ['172.16.0.0/12', '10.0.2.0/24'],
    });
    expect(config.ward?.clientId).toBe('ro-housing');
  });

  it('names every bad variable at once', () => {
    let error: unknown;
    try {
      loadConfig({ PORT: 'eighty', PUBLIC_ORIGIN: 'https://example.com/ro-housing/' });
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as Error).message).toMatch(/PORT/);
    expect((error as Error).message).toMatch(/PUBLIC_ORIGIN/);
  });

  it('refuses half the Ward settings, or a callback outside the API prefix', () => {
    expect(() => loadConfig({ WARD_OIDC_ISSUER: WARD.WARD_OIDC_ISSUER })).toThrow(ConfigError);
    expect(() =>
      loadConfig({ ...WARD, WARD_OIDC_REDIRECT_URI: 'https://example.com/auth/ward/callback' }),
    ).toThrow(/ro-housing-api\/auth\/ward\/callback/);
  });
});
