import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The app lives at `/ro-housing/` and reaches the API at `/ro-housing-api`,
 * locally and on the VPS alike, so one build runs in both places.
 * `RO_HOUSING_BASE` moves the app; the API path is fixed in src/base.ts.
 *
 * In development the API is on 127.0.0.1:3000 (`PORT` in the repo root's
 * `.env` moves it) and this proxy strips the prefix the way Caddy does, so the
 * browser sees one origin; the session cookie and Ward's callback
 * (`/ro-housing-api/auth/ward/callback`) ride on that one rule.
 *
 * The API refuses a sign-in whose `Origin` isn't its PUBLIC_ORIGIN
 * (`http://127.0.0.1:5173` by default). So a request whose `Origin` is exactly
 * the address the browser opened this server at (its `Host`, say
 * `localhost:5173`) reaches the API with PUBLIC_ORIGIN instead. Any other
 * `Origin` passes through untouched and is refused, as in production.
 */
function devProxy(env: Record<string, string>): Record<string, ProxyOptions> {
  const publicOrigin = env.PUBLIC_ORIGIN || 'http://127.0.0.1:5173';
  return {
    '/ro-housing-api': {
      target: `http://127.0.0.1:${env.PORT || 3000}`,
      // Host becomes 127.0.0.1:<port>, which the API's Host check answers.
      changeOrigin: true,
      rewrite: (url) => url.replace(/^\/ro-housing-api(?=\/|\?|$)/, '') || '/',
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          const { origin, host } = req.headers;
          if (typeof origin === 'string' && typeof host === 'string' && origin === `http://${host}`) {
            proxyReq.setHeader('origin', publicOrigin);
          }
        });
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, REPO_ROOT, '');
  const rawBase = process.env.RO_HOUSING_BASE || env.RO_HOUSING_BASE || '/ro-housing/';
  // Assets and the links in route.ts both assume exactly one trailing slash.
  const base = `${rawBase.replace(/\/+$/, '')}/`;

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: devProxy(env),
    },
    preview: { proxy: devProxy(env) },
  };
});
