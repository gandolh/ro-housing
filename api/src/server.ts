import Fastify from 'fastify';
import './db/index.ts';
import { issuesRoutes } from './routes/issues.ts';
import { listingsRoutes } from './routes/listings.ts';
import { refreshRoutes } from './routes/refresh.ts';
import { savedRoutes } from './routes/saved.ts';
import { sourcesRoutes } from './routes/sources.ts';
import { refuseOtherHosts } from './lib/host.ts';
import { refuseOtherOrigins } from './lib/origin.ts';
import { closeBrowser } from './lib/playwright.ts';

const app = Fastify({ logger: true });

// No CORS: the web app reaches the API through Vite's proxy, on its own
// origin. Requests whose Host is not this machine (DNS rebinding) and requests
// that name another website's origin are refused, before any route runs.
refuseOtherHosts(app);
refuseOtherOrigins(app);
await app.register(sourcesRoutes);
await app.register(listingsRoutes);
await app.register(refreshRoutes);
await app.register(issuesRoutes);
await app.register(savedRoutes);

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    app.log.info(`received ${sig}, shutting down`);
    await app.close();
    await closeBrowser();
    process.exit(0);
  });
}
