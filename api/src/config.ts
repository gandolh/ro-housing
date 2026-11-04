import { wardClientOptionsFromEnv, type WardClientOptions } from '../vendor/ward/ward-auth.js';

/** The API's prefix as the browser sees it. Caddy (and the Vite dev proxy)
 *  strip it before the request reaches the server, and the server strips it
 *  too when reached directly, so one build works both ways. It is also the
 *  session cookie's path. */
export const API_PREFIX = '/ro-housing-api';
/** Where the web app is served, with a trailing slash (web/vite.config.ts). */
export const WEB_BASE = '/ro-housing/';
/** Where the sign-in routes sit, Fastify-side. */
export const AUTH_ROUTE_PREFIX = '/auth';
/** Ward's callback as the browser reaches it, under the API prefix. */
export const WARD_CALLBACK_PATH = `${API_PREFIX}${AUTH_ROUTE_PREFIX}/ward/callback`;
/** The session cookie. Unique in the estate: the apps share one origin. */
export const SESSION_COOKIE = 'ro_housing_session';
/** The Vite dev server, the address the README opens. */
export const DEFAULT_PUBLIC_ORIGIN = 'http://127.0.0.1:5173';
export const DEFAULT_PORT = 3000;

/** The server's settings, read once at start from the environment (and the
 *  repo root's `.env`, see env.ts). The database and the issues folder are
 *  read where they are opened (paths.ts). */
export interface Config {
  /** `HOST`: the address to listen on. `0.0.0.0` in the container. */
  host: string;
  port: number;
  /** `PUBLIC_ORIGIN`: the app's origin as the browser sees it, bare. The
   *  sign-in routes refuse a POST whose Origin is not this one; the Host and
   *  Origin guards let it through. */
  publicOrigin: string;
  /** "Sign in with Ward", or undefined when `WARD_OIDC_ISSUER` is unset (local
   *  accounts only). `clientKey` is a secret: never log it. */
  ward: WardClientOptions | undefined;
  /** `AUTH_TRUSTED_PROXIES`, comma-separated: peers besides loopback whose
   *  `X-Forwarded-For` the login lockout believes. Empty locally; in the
   *  container, the range Caddy reaches it from. */
  trustedProxies: string[];
}

/** The environment can't run the server. The message names each variable at fault. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const set = (value: string | undefined): string | undefined => {
  const v = value?.trim();
  return v ? v : undefined;
};

/** The settings from `env`, or a `ConfigError` naming every bad variable.
 *  Nothing here talks to Ward, so the API starts while Ward is down. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const problems: string[] = [];

  const portText = set(env.PORT);
  const port = portText === undefined ? DEFAULT_PORT : Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push('PORT must be a port number (1-65535).');
  }

  const publicOrigin = set(env.PUBLIC_ORIGIN) ?? DEFAULT_PUBLIC_ORIGIN;
  if (!URL.canParse(publicOrigin) || new URL(publicOrigin).origin !== publicOrigin) {
    problems.push(
      'PUBLIC_ORIGIN must be a bare origin such as https://example.com: no path and no trailing slash.',
    );
  }

  let ward: WardClientOptions | undefined;
  try {
    ward = wardClientOptionsFromEnv(env);
  } catch (error) {
    problems.push(
      `${error instanceof Error ? error.message : String(error)}. Set all of them, or leave WARD_OIDC_ISSUER empty for local accounts only.`,
    );
  }
  if (ward && (!URL.canParse(ward.redirectUri) || new URL(ward.redirectUri).pathname !== WARD_CALLBACK_PATH)) {
    problems.push(
      `WARD_OIDC_REDIRECT_URI must be the callback as the browser reaches it: the app's origin, then ${WARD_CALLBACK_PATH}.`,
    );
  }

  if (problems.length > 0) throw new ConfigError(problems.join('\n'));
  return {
    host: set(env.HOST) ?? '127.0.0.1',
    port,
    publicOrigin,
    ward,
    trustedProxies: (env.AUTH_TRUSTED_PROXIES ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== ''),
  };
}
