// First: fills the environment from the repo root's .env before the database
// module reads RO_HOUSING_DB.
import './env.ts';
import { buildApp } from './app.ts';
import { ConfigError, loadConfig, type Config } from './config.ts';
import { DB_PATH } from './db/index.ts';
import { closeBrowser } from './lib/playwright.ts';
import { wicketClient } from './lib/wicket.ts';
import { issuesDir } from './paths.ts';

let config: Config;
try {
  config = loadConfig(process.env);
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  console.error(`ro-housing cannot start:\n${err.message}`);
  process.exit(1);
}

const app = await buildApp({
  publicOrigin: config.publicOrigin,
  ward: config.ward,
  trustedProxies: config.trustedProxies,
  bindHost: process.env.HOST,
  webOriginsEnv: process.env.WEB_ORIGINS,
  wicket: config.wicket && wicketClient(config.wicket),
  logger: true,
});
app.log.info(`database: ${DB_PATH}; issues: ${issuesDir()}; public origin: ${config.publicOrigin}`);
app.log.info(
  config.ward
    ? 'Sign in with Ward is on'
    : 'WARD_OIDC_ISSUER is not set: local accounts only, no Sign in with Ward',
);
app.log.info(
  config.wicket
    ? `Fill the gaps is on, through Wicket at ${config.wicket.url}`
    : 'WICKET_URL or WICKET_TOKEN is not set: no Fill the gaps',
);

try {
  await app.listen({ port: config.port, host: config.host });
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
